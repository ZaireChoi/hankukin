-- HANKUKIN — Phase 2 스키마 (Korea Now / Decode)
-- Phase 1 스키마(schema.sql) 적용 후 실행한다.

create type trend_stage    as enum ('emerging','rising','hot','mainstream','cooling','archive');
create type signal_source  as enum ('search','shopping','music','social','media');
create type signal_status  as enum ('ok','insufficient_volume','too_short');

-- ── 트렌드 신호 (원자료) ────────────────────────────────────────
create table trend_signal (
  id             uuid primary key default gen_random_uuid(),
  topic_id       uuid,                       -- 아래 trend_topic. 병합 전에는 null 가능
  source_type    signal_source not null,
  source_url     text,
  geography      text not null default 'KR',
  audience_segment text,                     -- 근거 있을 때만 채운다 (06 §2.1)
  observed_at    date not null,
  period_start   date not null,
  raw_score      numeric,                    -- DataLab ratio 원값
  anchor_score   numeric,                    -- 같은 요청 안의 앵커 값
  normalized_score numeric,                  -- raw / anchor — 요청 간 비교는 이 값으로만
  status         signal_status not null default 'ok',
  evidence_quality text,
  created_at     timestamptz not null default now(),
  -- 같은 소스/같은 주의 중복 수집 방지
  unique (topic_id, source_type, period_start)
);
create index on trend_signal (topic_id, observed_at desc);

comment on column trend_signal.raw_score is
  'Naver DataLab ratio 는 요청 내 상대값이다. 서로 다른 요청의 raw_score 를 직접 비교하면 안 된다.';
comment on column trend_signal.normalized_score is
  '고정 앵커 키워드 대비 비율. 요청·날짜를 넘어선 비교는 반드시 이 값으로 한다.';

-- ── 트렌드 토픽 ────────────────────────────────────────────────
create table trend_topic (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  aliases       text[] not null default '{}',   -- 철자 변형은 하나로 병합 (05 §8)
  category      text not null check (category in ('food','beauty','fashion','music','places','lifestyle')),
  stage         trend_stage,
  independent_sources int not null default 0,
  first_seen_at date not null,
  last_seen_at  date not null,
  weeks_observed int not null default 0,
  try_it_instructions text,
  related_entities jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- 핵심 규칙 (05 §8, 11 §4): 독립 신호가 2개 미만이면 emerging 을 넘을 수 없다.
  -- 애플리케이션 버그가 있어도 DB 가 막는다.
  constraint single_source_capped
    check (independent_sources >= 2 or stage in ('emerging','archive') or stage is null)
);
create index on trend_topic (stage, last_seen_at desc);

-- ── 신조어 ─────────────────────────────────────────────────────
create table slang_entry (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  korean_expression   text not null,
  pronunciation       text not null,
  literal_meaning     text not null,
  pragmatic_meaning   text not null,
  tone                text not null,
  politeness_level    text not null check (politeness_level in ('banmal','haeyo','hapsyo','mixed','neutral')),
  audience_segment    text,                    -- 근거 없으면 null (11 §8)
  use_cases           text[] not null default '{}',
  avoid_cases         text[] not null default '{}',
  subtitle_context    text,
  localized_equivalents jsonb not null default '{}'::jsonb,
  origin_status       text not null default 'origin_uncertain'
                      check (origin_status in ('verified','origin_uncertain')),
  trend_stage         trend_stage,
  is_standard_korean  boolean not null default false,   -- 신조어를 표준어로 단정하지 않는다 (06 §8)
  warning_label       text,                    -- 욕설·혐오 표현이면 교육적 맥락 경고 필수
  checked_at          timestamptz not null default now(),
  created_at          timestamptz not null default now()
);

comment on column slang_entry.origin_status is
  '공식 근거가 없으면 origin_uncertain 이 기본값이다 (06 §8). 추정 기원을 사실로 쓰지 않는다.';
