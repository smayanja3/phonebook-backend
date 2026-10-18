require('dotenv').config()
const express = require('express')
//Morgan is middleware that automatically prints one line to your terminal for every request: the verb, URL, status code, and how long it took.
const morgan = require('morgan')
const Person = require('./models/person')
// is middleware and tells the browser the requests are allowed
const cors = require('cors')
const app = express()
const PORT = process.env.PORT || 3001 // use the port the host gives me if non use 3001
const session = require('express-session')
const { MongoStore } = require('connect-mongo')
const bcrypt = require('bcrypt')
const User = require('./models/user')


//The function receives the request, and whatever it returns is what morgan prints for :body.
morgan.token('body', (request) => {
  //never logs credentials PRIVACYYYYYYY
  if (request.path === '/login' || request.path === '/register') {
    return '[hidden]'
  }
  return 'BODY>> ' + JSON.stringify(request.body)
})

app.use(cors())
//when data is sent the server recieves raw text express.json() converts it into JS object and puts it on req.body
app.use(express.json()) //<- must come before routes so it sits at the top of the page
//browser form donot send JSON =so we need urlencoded
app.use(express.urlencoded({ extended: true }))
//vv render sits behind a proxy, so trust it for secure cookies
app.set('trust proxy', 1)


app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false, // only daves a session when something is stored in it... so visitor who do not long in can not create db entries == saveUninitialized
  saveUninitialized: false,
  // session. lives in Atlas db in collection called sessions
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
  cookie: {
    httpOnly: true, // broswer JS can not read the cookies
    sameSite: 'lax', // not sent on cross-site POSTs
    secure: process.env.NODE_ENV === 'production', // HTTP only lives here
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 Days
  }
}))

//makes currentUser available in every EJS page
app.use((req, res, next) => {
  res.locals.currentUser = req.session.username || null
  res.locals.currentUserId = req.session.userId || null
  next()
})

const requireLogin = (req, res, next) => {
  if (req.session.userId) {
    return next()
  }
  res.redirect('/login')
}

const requireLoginApi = (req, res, next) => {
  if (req.session.userId) {
    return next()
  }
  res.status(401).json({ error: 'login required' })
}

app.use(morgan(':method :url :status :res[content-length] - :response-time ms :body'))
//renders .ejs files
app.set('view engine', 'ejs')
//serves CSS and browser JS
app.use(express.static('public'))

//------------------- AUTH ---------------------//
///// REGISTER /////

app.get('/register', (req, res) => {
  res.render('register', { error: null })
})

app.post('/register', (req, res, next) => {
  const { username, password } = req.body

  // checking to make sure the info passed is a string and not like ${b}x4 etc.
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(400).render('register', { error: 'Username and password are required' })
  }
  if (password.length < 8) {
    return res.status(400).render('register', { error: 'Password must be at least 8 characters ' })
  }

  // the password hash = 10 and ONLY the hash is stored
  bcrypt.hash(password, 10)
    .then(passwordHash => new User({ username, passwordHash }).save())
    .then(() => {
      res.redirect('/login')
    })
    .catch(error => {
      if (error.code === 11000) {
        return res.status(400).render('register', { error: 'That username is taken' })
      }
      if (error.name === 'ValidationError') {
        return res.status(400).render('register', { error: 'Username must be at least 8 characters.' })
      }
      next(error)
    })
})

///// LOGIN & LOGOUT /////

app.get('/login', (req, res) => {
  res.render('login', { error: null })
})

app.post('/login', (req, res, next) => {
  const { username, password } = req.body
  // broad failure, so attackers can't tell which part was wrong
  const fail = () => res.status(401).render('login', { error: 'Invalid username or password.' })

  if (typeof username !== 'string' || typeof password !== 'string') {
    return fail()
  }

  User.findOne({ username })
    .then(user => {
      if (!user) {
        return fail()
      }

      return bcrypt.compare(password, user.passwordHash).then(matches => {
        if (!matches) {
          return fail()
        }

        // a fresh session id on login blocks
        req.session.regenerate(regenError => {
          if (regenError) {
            return next(regenError)
          }
          req.session.userId = user.id
          req.session.username = user.username
          req.session.save(saveError => {
            if (saveError) {
              return next(saveError)
            }
            res.redirect('/')
          })
        })
      })
    })
    .catch(error => next(error))
})

// logot is a POST so a random link or img cant log you out
app.post('/logout', (req, res, next) => {
  req.session.destroy(error => {
    if (error) {
      return next(error)
    }
    res.clearCookie('connect.sid')
    res.redirect('/')
  })
})


/////////// NEW (Part 3c): MongoDB version /////////////

//------------------- GET---------------------//
// renders index.ejs and passes it the people from db
app.get('/', (req, res, next) => {
  Person.find({})
    .then(persons => {
      res.render('index', { persons, error: null })
    })
    .catch(error => next(error))
})


// fetch catches every person from the db/ find({}) = no conditions, give me everything
app.get('/api/persons', (req, res, next) => {
  Person.find({}).then(persons => {
    res.json(persons)
  })
    .catch(error => next(error))
})

// finds one person by id/ findById returns null if = no id
// a malformed if throws CastError
app.get('/api/persons/:id', (req, res, next) => {
  Person.findById(req.params.id)
    .then(person => {
      if (person) {
        res.json(person)
      } else {
        res.status(404).end()
      }
    })
    .catch(error => next(error))
})

//counts the people in the db instead of the old array
//countDocuments({}) = how many match 'no conditions"
app.get('/info', (req, res, next) => {
  Person.countDocuments({})
    .then(count => {
      res.send(`
                <p>Phonebook has info for ${count} people</p>
                <p>${new Date()}</p>
                `)
    })
    .catch(error => next(error))
})


//------------------- POST ---------------------//
//saves a new person to the db MongoDB creates id itself
// .then only goes out after the saved succeeded
app.post('/api/persons', requireLoginApi, (req, res, next) => {
  const body = req.body

  if (!body.name || !body.number) {
    return res.status(400).json({ error: 'name or number missing' })
  }

  const person = new Person({
    name: body.name,
    number: body.number,
    owner: req.session.userId, // owner always comes from the session not the req.body
  })

  person.save()
    .then(savedPerson => {
      res.json(savedPerson)
    })
    .catch(error => next(error))
})



app.post('/add', requireLogin, (req, res, next) => {
  const { name, number } = req.body

  if (!name || !number) {
    return Person.find({})
      .then(persons => {
        res.status(400).render('index', { persons, error: 'name or number missing' })
      })
      .catch(error => next(error))
  }

  const person = new Person({ name, number, owner: req.session.userId })

  person.save()
    .then(() => {
      res.redirect('/') // after a successful save -> go back to ('/')
    })
    .catch(error => {
      if (error.name === 'ValidationError') {
        return res.status(400).send('Invalid name or number. <a href="/">Go back</a>')
      }
      next(error)
    })
})


//------------------- PUT ---------------------//
//find the person by id
// change their fields
//save and send back the result
app.put('/api/persons/:id', requireLoginApi, (req, res, next) => {
  //pulls the two fields out of the req.body in one line. It’s the same as writing req.body.name and req.body.number
  const { name, number } = req.body

  //vv loads the existing person from the db
  Person.findOne({ _id: req.params.id, owner: req.session.userId })
    .then(person => {
      // no person w this id respond 404 and STOP
      if (!person) {
        return res.status(404).end()
      }
      //changing the loaded document in memory
      person.name = name
      person.number = number

      //a promise inside a promise. It’s slightly awkward
      //but it keeps the save from running when the person wasn’t found
      return person.save().then(updatedPerson => {
        res.json(updatedPerson)
      })
    })

    .catch(error => next(error))
})

//page route = used by the update in the form
// its apost becasue form can only GET or POST
// does the same job as the put (/api/persons/:id)
app.post('/update/:id', requireLogin, (req, res, next) => {
  const { number } = req.body

  if (!number) {
    return Person.find({})
      .then(persons => {
        res.status(400).render('index', { persons, error: 'number missing' })
      })
      .catch(error => next(error))
  }

  Person.findOne({ _id: req.params.id, owner: req.session.userId })
    .then(person => {
      // person was deleted -> go back to the list
      if (!person) {
        return res.redirect('/')
      }
      person.number = number

      return person.save().then(() => {
        res.redirect('/')
      })
    })
    .catch(error => next(error))
})


//------------------- DELETE ---------------------//

//API route = used to delete by REST client
//removes a person from the db by id
//findByIdAndDelete find matching doc and deletes it
//next(error) hands any error to express' error handling (have not built yet)
app.delete('/api/persons/:id', requireLoginApi, (req, res, next) => {
  Person.findOneAndDelete({ _id: req.params.id, owner: req.session.userId })
    .then(() => {
      res.status(204).end()
    })
    .catch(error => next(error))
})


//Page route = used by the delete button on the page
// its a POST because HTML forms can only send GET or POST
// recieves the delete button's form
//removes the person and redirects back to the page(could be any page i route)
app.post('/delete/:id', requireLogin, (req, res, next) => {
  Person.findOneAndDelete({ _id: req.params.id, owner: req.session.userId })
    .then(() => {
      res.redirect('/')
    })
    .catch(error => next(error))
})



/////////// OLD (Part 3a): in-memory version /////////////

// array is comment out because the db will replace it
// use let instead of const so we can add or delete persons
// let persons = [
//     {
//         "id": "1",
//         "name": "Arto Hellas",
//         "number": "040-123456"
//     },
//     {
//         "id": "2",
//         "name": "Ada Lovelace",
//         "number": "39-44-5323523"
//     },
//     {
//         "id": "3",
//         "name": "Dan Abramov",
//         "number": "12-43-234345"
//     },
//     {
//         "id": "4",
//         "name": "Mary Poppendieck",
//         "number": "39-23-6423122"
//     }
// ]

// // mongodb generates unique ids for us to use
// const generateId = () => String(Math.floor(Math.random() * 1000000))

// //old POST saved to the array == new POST above saves to the database.
// app.post('/api/persons', (req, res) => {
//      console.log('type:', typeof req.body)
//     console.log('direct:', JSON.stringify(req.body))
//     const body = req.body

//     if(!body.name || !body.number){
//         return res.status(400).json({error: 'name or number missing'})
//     }
//     if(persons.find(p => p.name === body.name)){
//         return res.status(400).json({error: 'name numst be unique'})
//     }

//     const person = {
//         id: generateId(),
//         name: body.name,
//         number: body.number
//     }
//     persons = persons.concat(person) // builds a new list with one more person.
//     // alternative person = persons.push(person)
//     res.json(person)
// })
// //concat takes an array and an item, and returns a brand new array with the item added at the end. Your original array is not changed
// //make a new list containing everything in persons plus person, then store that new list back in the persons variable


// app.get('/api/persons', (req, res) => {
//     res.json(persons)
// })

// app.get('/info', (req, res) => {
//     res.send(`
//         <p>Phonebook has info for ${persons.length} people</p>
//         <p>${new Date()}</p>
//     `)
// })

// app.get('/api/persons/:id', (req, res) => {
//     const person = persons.find(p => p.id === req.params.id)

//     if (person) {
//         res.json(person)
//     } else {
//         res.status(404).end()
//     }
// })

// app.delete('/api/persons/:id', (req, res) => {
//     const id = req.params.id
//     persons = persons.filter(p => p.id != id) //builds a new list without one person.

//     res.status(204).end()
// // :id is a placeholder
// //filter builds a new array w/every person except the one whose id matched, and that replaces persons.
// // 204 No Content = 'it worked nothing to send back'

// })

//must be under all routes  but above the app.listen
const errorHandler = (error, req, res, next) => {
  console.log(error.message)

  if (error.name === 'CastError') {
    return res.status(400).send({ error: 'malformatted id' })
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: error.message })
  }
  next(error)
}

app.use(errorHandler)


app.listen(PORT, () => {
  console.log(`Serving is buring oil ${PORT}`)
})


/*
<!-- <% %>runs JS and prints nothing (loops, if statements) -->
<!-- <%=  %>	prints a value into the page, escaped so it’s safe from injected HTML -->
 <!-- the forEach repeats the <li> once for ever person and the <%= inserts the name -->

*/