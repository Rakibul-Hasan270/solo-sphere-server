const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 4000;
const app = express();

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7ks5x.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();

        const jobsCollection = client.db('soloSphereDB').collection('jobs');
        const bidCollection = client.db('soloSphereDB').collection('bids');

        app.get('/jobs', async (req, res) => {
            const result = await jobsCollection.find().toArray();
            res.send(result)
        })

        app.get('/jobDetail/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await jobsCollection.findOne(filter);
            res.send(result);
        })

        app.post('/bid', async (req, res) => {
            const bidInfo = req.body;
            const result = await bidCollection.insertOne(bidInfo);
            res.send(result);
        })

        app.post('/addJob', async (req, res) => {
            const jobInfo = req.body;
            const result = await jobsCollection.insertOne(jobInfo);
            res.send(result);
        })

        // kono email ke patai diye data kuje niea asa--||-- const jobInfo = { job_title, deadline, category, min_price, max_price, description, buyer: { email, name: user?.displayName, photo: user?.photoURL } };

        app.get('/myJob/:email', async (req, res) => {
            const email = req.params.email;
            const query = { 'buyer.email': email };
            // console.log(query, 'ami query')
            const result = await jobsCollection.find(query).toArray();
            res.send(result);
        })

        app.put('/updateInfo/:id', async (req, res) => {
            const id = req.params.id;
            const info = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    ...info
                }
            }
            const result = await jobsCollection.updateOne(filter,  updateDoc, options);
            res.send(result);
        })

        // get all jobs posted by a specific user
        // app.get('/jobs/:email', async (req, res) => {
        //     const email = req.params.email
        //     const query = { 'buyer.email': email }
        //     const result = await jobsCollection.find(query).toArray()
        //     res.send(result)
        // })

        app.delete('/job/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await jobsCollection.deleteOne(filter);
            res.send(result);
        })

        app.put('/update/:id', async (req, res) => {
            const id = req.params.id;
            const jobBody = req.body;

        })

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('solo server is running');
})

app.listen(port, () => {
    console.log(`server is running on port ${port}`);
})