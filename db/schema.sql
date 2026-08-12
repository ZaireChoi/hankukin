-- HANKUKIN — Phase 1 스키마
-- 결정서 §5.1. 08번 문서의 엔티티 9종 중 4종만 실제 테이블로 만든다.
-- Person/Work 은 article.entities JSONB 로 시작하고, 기사 30편 이후 테이블로 승격한다.

create extension if not exists "pgcrypto";

-- ── enum ────────────────────────────────────────────────────────────────
create type risk_grade      as enum ('green','yellow','red');
create type article_type    as enum ('scene','guide','now_weekly','slang','place');
create type article_status  as enum ('draft','scheduled','published','unpublished');
create type source_type     as enum (
  'official_production','official_interview','official_social','public_institution',
  'reliable_media','aggregate_data','merchant_official','editorial','none');
create type claim_wording   as enum (
  'official_filming_location','confirmed_in_interview','official_social_appearance',
  'reported_by_media','inspired_by','suggested_nearby');
create type business_status as enum ('operating','temporarily_closed','permanently_closed','unknown');
create type relationship    as enum ('confirmed_use','inspired_by','suggested');
create type link_status     as enum ('ok','broken','redirected','unchecked');

-- ── source ──────────────────────────────────────────────────────────────
create table source (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  url         text not null,
  type        source_type not null,
  checked_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  unique (url)
);

-- ── place ───────────────────────────────────────────────────────────────
create table place (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  name_ko            text,
  address            text not null,
  lat                double precision,
  lng                double precision,
  map_place_id       text,
  business_status    business_status not null default 'unknown',
  hours_checked_at   timestamptz,
  public_access      boolean not null default true,
  safety_notes       text,
  official_url       text,
  guide_affiliate_url text,          -- 문서 13 확장 포인트. MVP 에서는 사용하지 않는다.
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index on place (business_status);
create index on place (hours_checked_at nulls first);

-- ── claim ───────────────────────────────────────────────────────────────
-- 신뢰의 핵심. 표현(allowed_wording)은 사람이 고르지 않고 source/confidence 에서 파생된다.
create table claim (
  id              uuid primary key default gen_random_uuid(),
  subject         text not null,
  predicate       text not null,
  object          text not null,
  source_id       uuid references source(id) on delete set null,
  source_count    int  not null default 1,
  confidence      text not null default 'low' check (confidence in ('low','medium','high')),
  allowed_wording claim_wording not null default 'inspired_by',
  reviewed_at     timestamptz not null default now()
);

-- ── article ─────────────────────────────────────────────────────────────
create table article (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null,
  lang          text not null default 'en',
  type          article_type not null,
  title         text not null,
  summary       text not null,
  body_md       text not null,
  entities      jsonb not null default '{"stars":[],"works":[],"places":[]}'::jsonb,
  risk_grade    risk_grade not null,
  content_score int not null,
  status        article_status not null default 'draft',
  published_at  timestamptz,
  checked_at    timestamptz not null default now(),
  localized_of  uuid references article(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (slug, lang),

  -- 04 §4: 65점 미만은 발행할 수 없다. 애플리케이션이 아니라 DB 가 강제한다.
  constraint score_threshold check (status <> 'published' or content_score >= 65),
  -- 05 §3: red 는 발행될 수 없다.
  constraint no_red_publish  check (status <> 'published' or risk_grade <> 'red')
);
create index on article (status, published_at desc);
create index on article (lang, type);
create index on article using gin (entities);

create table article_source (
  article_id uuid references article(id) on delete cascade,
  source_id  uuid references source(id)  on delete cascade,
  primary key (article_id, source_id)
);

-- ── affiliate_item ──────────────────────────────────────────────────────
create table affiliate_item (
  id                   uuid primary key default gen_random_uuid(),
  category             text not null,
  merchant             text not null,
  label                text not null,
  destination_countries text[] not null default '{}',
  affiliate_url        text not null,
  relationship_type    relationship not null default 'suggested',
  price_checked_at     timestamptz,
  link_status          link_status not null default 'unchecked',
  link_checked_at      timestamptz,
  active               boolean not null default true,
  created_at           timestamptz not null default now()
);
create index on affiliate_item (link_status, link_checked_at nulls first);

create table article_affiliate (
  article_id  uuid references article(id) on delete cascade,
  affiliate_id uuid references affiliate_item(id) on delete cascade,
  slot        text not null check (slot in ('visit_korea','bring_korea_home')),
  position    int not null default 0,
  primary key (article_id, affiliate_id)
);

-- ── event (Phase 1 은 6종만) ────────────────────────────────────────────
create table event (
  id         bigserial primary key,
  name       text not null check (name in (
    'article_view','affiliate_click','visit_korea_click',
    'bring_korea_home_click','map_open','error_report')),
  article_id uuid references article(id) on delete set null,
  lang       text,
  country    text,
  created_at timestamptz not null default now()
);
create index on event (name, created_at desc);

-- ── error_report ────────────────────────────────────────────────────────
-- 결정서 M6: 48시간 내 동일 URL 2건 이상 → 자동 비공개
create table error_report (
  id         uuid primary key default gen_random_uuid(),
  article_id uuid references article(id) on delete cascade,
  url        text not null,
  message    text,
  created_at timestamptz not null default now()
);
create index on error_report (url, created_at desc);

create or replace function auto_unpublish_on_reports() returns trigger as $$
begin
  if (select count(*) from error_report
      where url = new.url and created_at > now() - interval '48 hours') >= 2 then
    update article set status = 'unpublished', updated_at = now()
     where id = new.article_id and status = 'published';
  end if;
  return new;
end $$ language plpgsql;

create trigger trg_auto_unpublish
  after insert on error_report
  for each row execute function auto_unpublish_on_reports();

-- ── Phase 2 (Korea Now / Decode) — 스키마만 미리 정의, 사용은 나중에 ────
-- create table trend_signal (...);
-- create table trend_topic  (...);
-- create table slang_entry  (...);
