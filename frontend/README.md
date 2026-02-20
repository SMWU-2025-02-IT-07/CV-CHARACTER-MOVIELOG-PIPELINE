# AI Video Generation Wireframe (Copy)

AI 기반 영상 생성 플랫폼의 프로토타입입니다. 사용자가 캐릭터 이미지와 시나리오를 입력하면 AI가 자동으로 영상을 생성합니다.

## 주요 기능

### 🎬 4단계 영상 생성 프로세스
1. **캐릭터 설정** - 이미지 업로드 및 시나리오 입력
2. **시나리오 미리보기** - AI 생성 장면별 이미지 확인
3. **영상 생성** - 실시간 진행률과 함께 영상 제작
4. **결과 확인** - 완성된 영상 재생 및 다운로드

### ✨ 핵심 특징
- **직관적인 UI/UX**: 단계별 가이드와 애니메이션 효과
- **실시간 피드백**: 진행률 표시 및 상태 업데이트
- **데모 콘텐츠**: 3개 장면의 샘플 이미지 및 영상
- **플레이리스트 재생**: 여러 장면을 순차적으로 재생
- **반응형 디자인**: 모바일 및 데스크톱 최적화

## 기술 스택

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Lucide React Icons
- **State Management**: React Context API
- **Video Processing**: HTML5 Video API

## 프로젝트 구조

```
src/
├── app/
│   ├── components/
│   │   ├── Screen1.tsx    # 캐릭터 설정 화면
│   │   ├── Screen2.tsx    # 시나리오 미리보기
│   │   ├── Screen3.tsx    # 영상 생성 진행
│   │   └── Screen4.tsx    # 결과 확인
│   └── ui/                # 공통 UI 컴포넌트
├── context/
│   └── AppContext.tsx     # 전역 상태 관리
├── services/
│   ├── ai.service.ts      # AI 서비스 API
│   ├── storage.service.ts # 파일 업로드 서비스
│   └── video-merge.service.ts # 영상 병합 서비스
public/
└── demo/
    ├── images/            # 데모 이미지 (scene-1~3.png)
    └── videos/            # 데모 영상 (scene-1~3.mp4)
```

## 설치 및 실행

### 필수 요구사항
- Node.js 18+ 
- pnpm (권장) 또는 npm

### 설치
```bash
# 의존성 설치
pnpm install
# 또는
npm install
```

### 개발 서버 실행
```bash
# 개발 모드 실행
pnpm dev
# 또는
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 데모 콘텐츠 설정

프로젝트에는 데모용 이미지와 영상이 포함되어 있습니다:

- `public/demo/images/scene-1.png` - 첫 번째 장면 이미지
- `public/demo/images/scene-2.png` - 두 번째 장면 이미지  
- `public/demo/images/scene-3.png` - 세 번째 장면 이미지
- `public/demo/videos/scene-1.mp4` - 첫 번째 장면 영상
- `public/demo/videos/scene-2.mp4` - 두 번째 장면 영상
- `public/demo/videos/scene-3.mp4` - 세 번째 장면 영상

## 사용 방법

1. **캐릭터 이미지 업로드**: 원하는 캐릭터 이미지를 드래그 앤 드롭
2. **캐릭터 이름 입력**: 영상에 등장할 캐릭터의 이름 설정
3. **영상 설명 작성**: 원하는 장면과 행동을 자세히 설명
4. **시나리오 생성**: AI가 3개 장면으로 구성된 시나리오 자동 생성
5. **미리보기 확인**: 각 장면의 이미지와 설명 검토
6. **영상 생성**: 실시간 진행률을 확인하며 영상 제작
7. **결과 확인**: 완성된 영상을 재생하고 다운로드

## 커스터마이징

### AI 서비스 연동
`src/services/ai.service.ts` 파일에서 실제 AI API로 교체:
```typescript
export const AIService = {
  generateScenario: async (name: string, description: string) => {
    // 실제 AI API 호출로 교체
    const response = await fetch('/api/generate-scenario', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });
    return response.json();
  }
};
```

### 스토리지 서비스 연동
`src/services/storage.service.ts`에서 클라우드 스토리지 연동:
```typescript
export const StorageService = {
  uploadImage: async (file: File) => {
    // AWS S3, Cloudinary 등으로 교체
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData
    });
    return response.json().url;
  }
};
```

## 배포

### Vercel 배포
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel
```

### 기타 플랫폼
- **Netlify**: `npm run build` 후 `out` 폴더 배포
- **AWS Amplify**: Git 연동 후 자동 배포
- **Docker**: Dockerfile 포함 (컨테이너 배포)

## 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능합니다.

## 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 문의

프로젝트 관련 문의사항이나 버그 리포트는 GitHub Issues를 이용해 주세요.

---

**Original Figma Design**: [AI Video Generation Wireframe](https://www.figma.com/design/nqz7OgN2dQSqIwnGBqMbOZ/AI-Video-Generation-Wireframe--Copy-)