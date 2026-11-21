# Phonebook Backend

A phonebook app with user accounts and a REST API for managing contacts.

**Live Demo:** [Live Site](https://phonebook-backend-5u5x.onrender.com/api/persons)

---

## About

Users register and log in, then add contacts with a name and a US-style phone number (for example 617-555-0123). Each contact belongs to the user who created it, so users can only edit or delete their own entries. Anyone can view the list through the API, and the `/info` page shows how many people are in the phonebook.

---

## Built With

Node.js, Express, MongoDB, Mongoose, EJS, express-session, connect-mongo, bcrypt, Morgan, ESLint

---

## How It Works

- `index.js` holds the server, session setup, auth routes, and contact routes
- `models/person.js` defines a contact and validates the name and phone number
- `models/user.js` defines a user account (passwords are hashed with bcrypt)
- `views/` has the EJS pages for the home list, login, and register
- Sessions are saved in MongoDB so users stay logged in

### API Routes

| Method | Route | Description |
| --- | --- | --- |
| GET | `/api/persons` | Get all contacts |
| GET | `/api/persons/:id` | Get one contact |
| POST | `/api/persons` | Add a contact (login required) |
| PUT | `/api/persons/:id` | Update a contact (login required) |
| DELETE | `/api/persons/:id` | Delete a contact (login required) |
| GET | `/info` | Count of contacts and current time |

---

## Run It Locally

```bash
git clone https://github.com/smayanja3/phonebook-backend.git
cd phonebook-backend
npm install
```

Create a `.env` file:

```
MONGODB_URI=your-mongodb-connection-string
SESSION_SECRET=any-long-random-string
PORT=3001
```

Then run `npm run dev` and open `http://localhost:3001`.
