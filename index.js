const express = require('express')
const cors = require('cors');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');



//middleware
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const logger = (req, res, next) => {
  console.log('inside the logger middleware');
  next();

}

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;

  console.log('cookie in the middleware', req.cookies);
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })

  }

  //verify token
  jwt.verify(token, process.env.JWT_ACCESS_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'unauthorized access' })

    }
    req.decoded = decoded;
    next();
  })


}





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

    //jwt token related api
    app.post('/jwt', async (req, res) => {
      const userData = req.body;
      const token = jwt.sign(userData, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

      //set token in the cookies
      res.cookie('token', token, {
        httpOnly: true,
        secure: false
      })

      res.send({ success: true });
    })

    // jobs related api's here
    app.get('/jobs', async (req, res) => {
      //filtered by email
      const email = req.query.email;
      const query = {};
      if (email) {
        query.hr_email = email;
      }

      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    })

    app.get('/jobs/applications', async (req, res) => {
      const email = req.query.email;
      const query = { hr_email: email };
      const jobs = await jobsCollection.find(query).toArray();

      //should use aggregate 
      for (const job of jobs) {
        const applicationQuery = { jobId: job._id.toString() }
        const application_count = await applicationsCollection.countDocuments(applicationQuery)
        job.application_count = application_count;
      }
      res.send(jobs)
    })

    //get a single job
    app.get('/jobs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await jobsCollection.findOne(query);
      res.send(result);
    })

    //post a single job
    app.post('/jobs', async (req, res) => {
      const newJob = req.body;
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);

    })


    // applications related api's here
    app.get('/applications', logger, verifyToken, async (req, res) => {
      const email = req.query.email;

      if(email !== req.decoded.email){
        return res.status(403).send({ message: 'forbidden access' })
      }

      const query = {
        email: email
      }
      const result = await applicationsCollection.find(query).toArray()

      //bad way to agreegate data
      for (const application of result) {
        const jobId = application.jobId;
        const jobQuery = { _id: new ObjectId(jobId) }
        const job = await jobsCollection.findOne(jobQuery);
        application.title = job.title
        application.company = job.company
        application.company_logo = job.company_logo
        application.jobType = job.jobType
        application.category = job.category
        application.status = job.status
      }

      res.send(result);
    })

    //get add posted job query
    app.get('/applications/job/:job_id', async (req, res) => {
      const job_id = req.params.job_id;
      const query = { jobId: job_id };
      const result = await applicationsCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/applications', async (req, res) => {
      const application = req.body;
      const result = await applicationsCollection.insertOne(application);
      res.send(result);
    })

    app.patch('/applications/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          status: req.body.status
        }
      }
      const result = await applicationsCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    //delete an application
    app.delete('/applications/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }

      const result = await applicationsCollection.deleteOne(filter)
      res.send(result)
    })


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