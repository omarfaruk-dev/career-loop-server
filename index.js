const express = require('express')
const cors = require('cors');
require('dotenv').config()

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 3000;

//middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2vxppji.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
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
    // all collections here
    const jobsCollection = client.db('careerLoop').collection('jobs');
    const applicationsCollection = client.db('careerLoop').collection('applications')

    // jobs related api's here
    app.get('/jobs', async(req, res) => {
      const result = await jobsCollection.find().toArray();
      res.send(result);
    })

    //get a single job
    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.findOne(query);
      res.send(result);
    })

    // applications related api's here
    app.post('/applications', async(req, res)=>{
      const application = req.body;
      const result = await applicationsCollection.insertOne(application);
      res.send(result);
    })


    // post / create a user
    //  app.post('/users', async (req, res) => {
    //   const userData = req.body;
    //   const result = await usersCollection.insertOne(userData);
    //   res.send(result);
    // });
    
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

//server running default route
app.get('/', (req, res) => {
      res.send('Server is running')
    })

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});