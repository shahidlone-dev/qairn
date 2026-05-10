# Qairn Database Documentation

## Core Tables

### users
Stores user account information.

Fields:
- id
- username
- email
- phone
- avatar
- bio
- created_at

---

### posts
Stores campus feed posts.

Fields:
- id
- user_id
- content
- media_url
- created_at

Relations:
- belongs to users

---

### comments
Stores post comments.

Fields:
- id
- post_id
- user_id
- content
- created_at

---

### chats
Stores chat metadata.

Fields:
- id
- created_at

---

### messages
Stores realtime chat messages.

Fields:
- id
- chat_id
- sender_id
- message
- created_at

---

### marketplace
Stores marketplace listings.

Fields:
- id
- seller_id
- title
- description
- price
- created_at

---

### services
Stores student service listings.

Fields:
- id
- provider_id
- title
- description
- category
- created_at

---

## Authentication

Authentication uses JWT tokens.

Passwords should always be hashed before storage.

---

## Media Storage

Media uploads are handled through Cloudinary.

---

## Caching

Redis is used for caching and future realtime scaling.
