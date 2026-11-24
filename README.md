# 페르소나 자기소개 웹앱

클라우드데이터베이스 과제. 여러 정체성(학부생 / 자격증 준비생 / 디지털 드로잉 창작자 등)을 페르소나별로 소개하고, 경험 기록을 공유하는 자기소개 웹앱입니다.

## 화면
| ID | 파일 | 설명 |
|---|---|---|
| S01 | `index.html` | Home |
| S02 | `about.html` | 소개 |
| S03 | `personas.html` | 페르소나 목록 (태그 필터) |
| S04 | `persona.html?id=p1` | 페르소나 상세 (정렬, 더보기) |
| S05 | `experience.html?id=e1` | 경험기록 상세 (공감 버튼) |
| S06 | `questions.html` | 질문함 |

## 폴더 구조
```
index.html / about.html / personas.html / persona.html / experience.html / questions.html
css/style.css   # 모든 페이지 공통 서식 (맨 위 :root 변수로 색/둥글기 조정)
js/data.js      # 더미 데이터 (프로필, 페르소나, 경험기록, 질문)
js/app.js       # 렌더링 로직
images/         # 이미지 (프로필: images/profile.png)
```

## 로컬에서 확인
`index.html`을 브라우저로 열면 됩니다. (빌드 과정 없음)

## 배포 (S3 + CloudFront)
S3 버킷은 비공개로 두고 OAC로 CloudFront만 접근하게 설정합니다. 정적 웹사이트 호스팅 기능은 사용하지 않습니다.

```bash
aws s3 sync . s3://<버킷이름> --exclude ".git/*" --exclude "CLAUDE.md" --exclude "README.md"
```

```bash
aws cloudfront create-invalidation --distribution-id <배포ID> --paths "/*"
```

> AWS 자격 증명(Access Key 등)은 파일/커밋에 포함하지 않습니다.
