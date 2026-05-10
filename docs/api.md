# Qairn API Documentation

## Base URL

http://localhost:5000/api

---

# Authentication

## Login

POST /auth/login

Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "token": "jwt_token"
}
```

---

## Signup

POST /auth/signup

---

## Verify OTP

POST /auth/verify-otp

---

# Posts

## Get Feed Posts

GET /posts

---

## Create Post

POST /posts

---

## Delete Post

DELETE /posts/:id

---

# Users

## Get User Profile

GET /users/:id

---

## Update Profile

PUT /users/profile

---

# Uploads

## Upload Media

POST /upload

---

# Services

## Get Services

GET /services

---

# Market

## Get Marketplace Listings

GET /market

---

# Chats

## Get Chats

GET /chats

---

## Send Message

POST /chats/message
