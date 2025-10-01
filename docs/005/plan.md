# 체험단 상세 기능 모듈화 설계

## 1. 개요

사용자가 선택한 개별 체험단의 모든 상세 정보를 보여주는 페이지입니다. 백엔드에서 특정 ID의 캠페인 정보를 조회하는 API를 제공하고, 프론트엔드에서는 이 정보를 받아 렌더링합니다. 사용자의 인증 상태 및 역할에 따라 '지원하기' 버튼의 활성화 상태가 동적으로 변경되는 것이 핵심입니다.

| 모듈 이름 | 위치 | 설명 |
| --- | --- | --- |
| `CampaignDetailView.tsx` | `src/features/campaign/components/` | 캠페인 상세 정보를 표시하는 UI 컴포넌트. |
| `ApplyButton.tsx` | `src/features/campaign/components/` | 사용자의 자격(역할, 프로필 완성 여부)에 따라 상태가 변경되는 지원 버튼. |
| `useCampaignQuery.ts` | `src/features/campaign/hooks/` | 특정 ID의 캠페인 정보를 서버에서 조회하는 React Query `useQuery` 훅. |
| `page.tsx` | `src/app/campaigns/[id]/` | 캠페인 상세 페이지. `useCampaignQuery`로 데이터를 조회하고 `CampaignDetailView`를 렌더링. |
| `route.ts` | `src/features/campaign/backend/` | `GET /api/campaigns/:id` 엔드포인트를 정의하는 Hono 라우터. |
| `service.ts` | `src/features/campaign/backend/` | ID를 기반으로 `campaigns` 테이블에서 단일 레코드를 조회하는 서비스. |

## 2. Diagram

```mermaid
flowchart TD
    subgraph Frontend
        A[campaigns/[id]/page.tsx] --> B{useCampaignQuery.ts};
        A --> C(CampaignDetailView.tsx);
        C --> D(ApplyButton.tsx);
        D -- "check auth" --> E{useCurrentUser.ts};
        B -- "GET /api/campaigns/:id" --> F[api-client];
    end

    subgraph Backend
        F --> G[hono/app.ts];
        G --> H[campaign/route.ts];
        H -- "call service" --> I[campaign/service.ts];
        I -- "select by id" --> J[Supabase];
    end

    J -- "single campaign" --> K[(Database)];
```

## 3. Implementation Plan

### 1. Backend (`src/features/campaign/backend`)

- **`service.ts`**: `getCampaignById` 서비스를 구현합니다. ID를 받아 `campaigns` 테이블과 관련 정보(e.g., `advertiser_profiles`)를 join하여 조회합니다.
- **`route.ts`**: `GET /api/campaigns/:id` 라우트를 기존 `registerCampaignRoutes`에 추가합니다. 캠페인이 존재하지 않을 경우 404 에러를 반환합니다.

#### Unit Tests (Business Logic)

- **`campaign/service.ts`**
    - `[ ]` 유효한 ID로 요청 시, 해당 캠페인 정보를 정확히 반환해야 함.
    - `[ ]` 존재하지 않는 ID로 요청 시, `null` 또는 에러를 반환해야 함.

### 2. Frontend

- **`useCampaignQuery.ts`**: `useQuery`를 사용하여 `/api/campaigns/:id`를 호출하는 훅을 `useCampaignsQuery` 파일에 추가하거나 새로 생성합니다. 쿼리 키는 `['campaign', id]` 형식을 사용합니다.
- **`ApplyButton.tsx`**: `useCurrentUser` 훅을 사용하여 현재 사용자 정보를 가져옵니다. 사용자의 `isAuthenticated`, `role`, `profileCompleted`(가상) 상태에 따라 버튼을 다르게 렌더링합니다.
    - 비로그인: "로그인 후 지원하세요" (비활성 or 로그인 페이지 링크)
    - 광고주: 버튼 숨김
    - 프로필 미완성 인플루언서: "프로필을 완성해야 지원할 수 있습니다." (프로필 편집 페이지 링크)
    - 자격 완료 인플루언서: '지원하기' (활성)
- **`CampaignDetailView.tsx`**: `useCampaignQuery`로 조회한 모든 상세 정보(혜택, 미션, 지도 등)를 적절한 UI로 표시하고, `ApplyButton`을 포함합니다.
- **`page.tsx`**: `src/app/campaigns/[id]/page.tsx` 경로에 페이지를 생성합니다. URL에서 `id` 파라미터를 받아 `useCampaignQuery`에 넘겨주고, 로딩/에러 상태를 처리하며 `CampaignDetailView`를 렌더링합니다.

#### QA Sheet (Presentation)

- **`CampaignDetailView.tsx`**
    - `[ ]` 캠페인의 제목, 본문, 미션, 혜택, 위치 정보 등이 모두 정확하게 표시되는가?
    - `[ ]` 로딩 중일 때 스켈레톤 UI가 표시되는가?
    - `[ ]` 유효하지 않은 ID로 접근 시 "캠페인을 찾을 수 없습니다." 와 같은 에러 페이지가 표시되는가?
- **`ApplyButton.tsx`**
    - `[ ]` 비로그인 상태에서 지원 버튼이 비활성화되거나 로그인 안내 문구가 표시되는가?
    - `[ ]` 광고주 계정으로 로그인 시 지원 버튼이 보이지 않는가?
    - `[ ]` 프로필을 등록하지 않은 인플루언서에게 프로필 등록 안내가 표시되는가?
    - `[ ]` 모든 자격을 갖춘 인플루언서에게 '지원하기' 버튼이 활성화 상태로 표시되는가?
