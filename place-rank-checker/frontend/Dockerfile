FROM node:20-alpine

WORKDIR /app

# 패키지 설치
COPY package*.json ./
RUN npm install

# 소스 코드 복사
COPY . .

# 포트 노출
EXPOSE 3000

# 개발 서버 실행
CMD ["npm", "run", "dev", "--", "--host"]
