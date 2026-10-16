const express = require('express')
//Morgan is middleware that automatically prints one line to your terminal for every request: the verb, URL, status code, and how long it took.
const morgan = require('morgan')
// is middleware and tells the browser the requests are allowed
const cors = require('cors')
const app = express()
const PORT = process.env.PORT || 3001 // use the port the host gives me if non use 3001

//The function receives the request, and whatever it returns is what morgan prints for :body.
morgan.token('body', (request) => {
    return 'BODY>> ' + JSON.stringify(request.body)
})

app.use(cors())
//when data is sent the server recieves raw text express.json() converts it into JS object and puts it on req.body
app.use(express.json()) //<- must come before routes so it sits at the top of the page
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :body'))


// use let instead of const so we can add or delete persons 
let persons = [
    {
        "id": "1",
        "name": "Arto Hellas",
        "number": "040-123456"
    },
    {
        "id": "2",
        "name": "Ada Lovelace",
        "number": "39-44-5323523"
    },
    {
        "id": "3",
        "name": "Dan Abramov",
        "number": "12-43-234345"
    },
    {
        "id": "4",
        "name": "Mary Poppendieck",
        "number": "39-23-6423122"
    }
]

const generateId = () => String(Math.floor(Math.random() * 1000000))

app.post('/api/persons', (req, res) => {
     console.log('type:', typeof req.body)
    console.log('direct:', JSON.stringify(req.body))
    const body = req.body

    if(!body.name || !body.number){
        return res.status(400).json({error: 'name or number missing'})
    }
    if(persons.find(p => p.name === body.name)){
        return res.status(400).json({error: 'name numst be unique'})
    }

    const person = {
        id: generateId(),
        name: body.name,
        number: body.number
    }
    persons = persons.concat(person) // builds a new list with one more person.
    // alternative person = persons.push(person)
    res.json(person)
})
//concat takes an array and an item, and returns a brand new array with the item added at the end. Your original array is not changed
//make a new list containing everything in persons plus person, then store that new list back in the persons variable


app.get('/api/persons', (req, res) => {
    res.json(persons)
})

app.get('/info', (req, res) => {
    res.send(`
        <p>Phonebook has info for ${persons.length} people</p>
        <p>${new Date()}</p>
    `)
})

app.get('/api/persons/:id', (req, res) => {
    const person = persons.find(p => p.id === req.params.id)

    if (person) {
        res.json(person)
    } else {
        res.status(404).end()
    }
})

app.delete('/api/persons/:id', (req, res) => {
    const id = req.params.id
    persons = persons.filter(p => p.id != id) //builds a new list without one person.

    res.status(204).end()
// :id is a placeholder
//filter builds a new array w/every person except the one whose id matched, and that replaces persons.
// 204 No Content = 'it worked nothing to send back'

})

app.listen(PORT, () => {
    console.log(`Serving is buring oil ${PORT}`)
})