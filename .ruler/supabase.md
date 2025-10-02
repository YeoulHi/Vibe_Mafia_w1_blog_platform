---
description: Supabase Migration SQL Guideline
globs: supabase/migrations/*.sql
---

# Supabase Migration SQL Guideline

## Must

- Each migration file must have a unique name with number prefix (e.g., `0001_create_users_table.sql`)
- Each migration must be idempotent (can be run multiple times without error)
- Use `CREATE TABLE IF NOT EXISTS` instead of just `CREATE TABLE`
- Include proper error handling with `BEGIN` and `EXCEPTION` blocks
- Add comments for complex operations
- Always specify column types explicitly
- Include proper constraints (NOT NULL, UNIQUE, etc.) where appropriate
- Add updated_at column to all tables, and use trigger to update it
- always check other migrations to avoid conflicts

## Should

- Keep migrations small
- Use consistent naming conventions for tables and columns
- Use snake_case for all identifiers
- Document breaking changes
- MUST NOT use RLS. disable it for all tables

## Recommended Patterns

- Set up proper indexes for frequently queried columns
- Use foreign key constraints to maintain referential integrity
- Leverage Postgres extensions when appropriate
- Use enums for fields with a fixed set of values
- Consider using views for complex queries

## Schema Organization

- Group related tables together
- Use schemas to organize tables by domain
- Consider using Postgres schemas for multi-tenant applications
- Keep authentication tables in the auth schema

## Performance Considerations

- Avoid adding/removing columns from large tables in production
- Use appropriate data types to minimize storage
- Add indexes strategically (not excessively)

## Security Best Practices

- Never store plaintext passwords
- Sanitize/validate all user inputs

---

## Common Patterns

### Upsert 로직

**패턴 1: 존재 여부 확인 후 조건부 생성**

```typescript
// ✅ 안전한 패턴 (maybeSingle 사용)
const { data: existing, error } = await supabase
  .from('table')
  .select('id')
  .eq('user_id', userId)
  .maybeSingle(); // single() 대신 사용 (없을 경우 null 반환)

if (error) {
  throw error;
}

let recordId: number;

if (existing) {
  recordId = existing.id;
} else {
  const { data: created, error: createError } = await supabase
    .from('table')
    .insert({ user_id: userId })
    .select('id')
    .single();

  if (createError) {
    throw createError;
  }

  recordId = created.id;
}
```

**패턴 2: Supabase upsert 사용**

```typescript
// ✅ Supabase upsert 함수 사용
const { data, error } = await supabase
  .from('table')
  .upsert(
    { user_id: userId, /* other fields */ },
    { onConflict: 'user_id' } // UNIQUE constraint 필요
  )
  .select('id')
  .single();
```

### 관계 데이터 처리

**패턴 1: 삭제 후 재생성 (간단한 방식)**

```typescript
// ✅ 간단한 방식: 전체 삭제 후 재삽입
// 1. 기존 데이터 삭제
await supabase
  .from('child_table')
  .delete()
  .eq('parent_id', parentId);

// 2. 새 데이터 삽입
if (items.length > 0) {
  const itemsToInsert = items.map(item => ({
    parent_id: parentId,
    ...item,
  }));

  await supabase
    .from('child_table')
    .insert(itemsToInsert);
}
```

**패턴 2: Diff 기반 업데이트 (프로덕션 권장)**

```typescript
// ✅ 복잡하지만 효율적: 변경 감지 후 diff 적용
// 1. 기존 데이터 조회
const { data: existing } = await supabase
  .from('child_table')
  .select('*')
  .eq('parent_id', parentId);

// 2. Diff 계산
const toDelete = existing.filter(e => !items.find(i => i.id === e.id));
const toUpdate = items.filter(i => existing.find(e => e.id === i.id));
const toInsert = items.filter(i => !i.id);

// 3. 각각 처리
// 삭제
if (toDelete.length > 0) {
  await supabase
    .from('child_table')
    .delete()
    .in('id', toDelete.map(d => d.id));
}

// 업데이트
for (const item of toUpdate) {
  await supabase
    .from('child_table')
    .update(item)
    .eq('id', item.id);
}

// 삽입
if (toInsert.length > 0) {
  await supabase
    .from('child_table')
    .insert(toInsert);
}
```

---

## 대소문자 일관성 (중요!)

### CHECK Constraint와 코드 일치

**Must**:
- SQL CHECK constraint의 값과 애플리케이션 코드의 enum 값이 **정확히 일치**해야 함
- 대소문자 구분 필수

```sql
-- ✅ Migration
CREATE TABLE users (
  role VARCHAR(20) NOT NULL CHECK (role IN ('advertiser', 'influencer'))
);
```

```typescript
// ✅ Backend Code - 소문자 사용 (SQL과 일치)
const isInfluencer = userData.role === 'influencer';
const isAdvertiser = userData.role === 'advertiser';

// ❌ 잘못된 예 - 대문자 (SQL과 불일치)
const isInfluencer = userData.role === 'INFLUENCER'; // 절대 매칭 안됨!
```

```typescript
// ✅ Zod Schema - 소문자 사용
export const roleSchema = z.enum(['advertiser', 'influencer'], {
  required_error: '역할을 선택해주세요.',
});
```

### Enum 값 정의 패턴

```sql
-- ✅ 추천: CHECK constraint로 값 제한
CREATE TABLE some_table (
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- 또는 Postgres ENUM 타입 사용
CREATE TYPE status_type AS ENUM ('pending', 'approved', 'rejected');
CREATE TABLE some_table (
  status status_type NOT NULL
);
```

```typescript
// ✅ 코드에서도 동일한 값 사용
export const statusSchema = z.enum(['pending', 'approved', 'rejected']);

// Service에서 사용
const isPending = record.status === 'pending';
```

---

## 에러 코드 참고

### PGRST116: No rows found
- `single()` 호출 시 결과가 없을 때 발생
- 해결: `maybeSingle()` 사용하여 null 반환 받기

```typescript
// ❌ single() - 없으면 에러
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('id', id)
  .single(); // PGRST116 에러 발생 가능

// ✅ maybeSingle() - 없으면 null
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('id', id)
  .maybeSingle(); // 없으면 data = null
```

### 23505: Unique constraint violation
- UNIQUE 제약 조건 위반
- 일반적으로 중복 데이터 삽입 시 발생

```typescript
if (error?.code === '23505') {
  return failure(409, 'DUPLICATE', '이미 존재하는 데이터입니다.');
}
```

### 23514: Check constraint violation
- CHECK 제약 조건 위반
- 허용되지 않는 값 삽입 시 발생 (예: role에 잘못된 값)

```typescript
if (error?.code === '23514') {
  return failure(400, 'INVALID_VALUE', '허용되지 않는 값입니다.');
}
```
