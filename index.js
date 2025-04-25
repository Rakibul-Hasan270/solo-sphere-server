const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cookieParser = require('cookie-parser');
const port = process.env.PORT || 4000;
const app = express();

app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// verify Token
const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).send('unauthorized access');
    }
    if (token) {
        jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
            if (error) {
                return res.status(401).send('unauthorized access');
            }
            // console.log(decoded);
            req.user = decoded;
            next();
        })
    }
}

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

        // jwt token 
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '1d' })
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict'
            }).send({ success: true })
        })

        // app.get('/bid-count', async (req, res) => {
        //     try {
        //         const count = await jobsCollection.estimatedDocumentCount(); // বা .countDocuments() ও ইউজ করা যায়
        //         res.send({ total: count });
        //     } catch (err) {
        //         res.status(500).send({ message: 'Error counting bids', error: err.message });
        //     }
        // });

        app.get('/logout', (req, res) => {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
                maxAge: 0
            }).send({ success: true })
        })


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
            const query = {
                jobId: bidInfo.jobId,
                email: bidInfo.email
            }
            const alreadyAdded = await bidCollection.findOne(query);
            if (alreadyAdded) {
                return res.status(400).send({ message: 'you have already bid this job' });
            }
            const result = await bidCollection.insertOne(bidInfo);
            res.send(result);
        })

        app.post('/addJob', verifyToken, async (req, res) => {
            const jobInfo = req.body;
            const result = await jobsCollection.insertOne(jobInfo);
            res.send(result);
        })

        // kono email ke patai diye data kuje niea asa--||-- const jobInfo = { job_title, deadline, category, min_price, max_price, description, buyer: { email, name: user?.displayName, photo: user?.photoURL } };
        app.get('/myJob/:email', verifyToken, async (req, res) => {
            const tokenEmail = req.user.email;
            const email = req.params.email;
            if (tokenEmail !== email) return res.status(403).send({ message: 'forbidden access' });
            const query = { 'buyer.email': email };
            // console.log(query, 'ami query')
            const result = await jobsCollection.find(query).toArray();
            res.send(result);
        })

        app.put('/updateInfo/:id', verifyToken, async (req, res) => {
            const id = req.params.id;
            const info = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    ...info
                }
            }
            const result = await jobsCollection.updateOne(filter, updateDoc, options);
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

        // akta user email (property) diye database theke data neyha 
        app.get('/myBids/:email', verifyToken, async (req, res) => {
            const emailToken = req.user.email;
            const email = req.params.email;
            if (emailToken !== email) {
                return res.status(401).send({ message: 'forbidden access' });
            }
            const filter = { email };
            const result = await bidCollection.find(filter).toArray();
            res.send(result);
        })

        app.get('/bidRequest/:email', verifyToken, async (req, res) => {
            const emailToken = req.user.email;
            const email = req.params.email;
            if (emailToken !== email) {
                return res.status(401).send({ message: 'forbidden access' });
            }
            const filter = { 'buyer.email': email };
            const result = await bidCollection.find(filter).toArray();
            res.send(result);
        })

        // bid status update  
        app.patch('/bid-status/:id', async (req, res) => {
            const id = req.params.id;
            const currentStatus = req.body;
            // console.log(id, currentStatus);  //  { status: 'In Progress' }
            const query = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: { ...currentStatus }
            }
            const result = await bidCollection.updateOne(query, updateDoc);
            res.send(result);
        })

        // count for pagination
        app.get('/jobs-count', async (req, res) => {
            const count = await jobsCollection.countDocuments();
            res.send({ count });
        })

        // all jobs for pagination
        app.get('/all-jobs', async (req, res) => {
            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            const result = await jobsCollection.find().skip(page * size).limit(size).toArray();
            res.send(result)
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