const express = require('express');
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000
app.use(cors({
  origin: ['http://localhost:5173', 'https://ugly-limit.surge.sh'],
  credentials: true, // Allow credentials (cookies)
}));
app.use(express.json())



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.h4wau.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
    //await client.connect();

    const bookingCollection = client.db('Steadypartner').collection('bookings');
    const userCollection = client.db('Steadypartner').collection('users');
    const reviewCollection = client.db('Steadypartner').collection('reviews');

    const verifyAdmin=async(req,res,next)=>{
      const email=req.decoded.email;
      const query={email:email};
      const user=await userCollection.findOne(query);
      const isAdmin=user?.role==='admin'
      if(!isAdmin){
        return res.status(403).send({message:"Forbidden access"})
      }
      next()
    }
    const verifyDriver=async(req,res,next)=>{
      const email=req.decoded.email;
      const query={email:email};
      const user=await userCollection.findOne(query);
      const isDriver=user?.role==='driver'
      if(!isDriver){
        return res.status(403).send({message:"Forbidden access"})
      }
      next()
    }
    const verifyUser=async(req,res,next)=>{
      const email=req.decoded.email;
      const query={email:email};
      const user=await userCollection.findOne(query);
      const isUser=user?.role==='user'
      if(!isUser){
        return res.status(403).send({message:"Forbidden access"})
      }
      next()
    }
    const verifyToken = (req, res, next) => {
      console.log(req.headers.authorization)
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "Forbiddenn access" })
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Forbidden access" })
        }
        req.decoded = decoded;
        next()
      })

    }
    app.get('/user/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'UnAuthorized Access' })
      }
      const query = { email: email }
      const user = await userCollection.findOne(query);
      console.log(user)
      let admin = false;
      if (user) {
        admin = user?.role === 'admin';

      }
      res.send({ admin })
    })
    app.get('/user/driver/:email', verifyToken,async (req, res) => {
      const email = req.params.email;
      console.log("email",req.params.email)
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'UnAuthorized Access' })
      }
      const query = { email: email }
      const user = await userCollection.findOne(query);
      console.log("j",user)
      let driver = false;
      if (user) {
        driver = user?.role === 'driver';
      }
      console.log(driver,user)
      res.send({ driver})
    })
    app.get('/user/random/:email', verifyToken,async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'UnAuthorized Access' })
      }
      const query = { email: email }
      const user = await userCollection.findOne(query);
      console.log(user)
      let random = false;
      if (user) {
        random = user?.role === 'user';

      }
      console.log(random)
      res.send({ random })
    })
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1hr'
      })
      res.send({ token })
    })

    app.post('/booking', async (req, res) => {
      const book = req.body;
      console.log(book.name)
      const result = await bookingCollection.insertOne(book);
      res.send(result);
    })
    app.post('/user', async (req, res) => {
      const user = req.body;

      const query = { email: user.email }
      const existinguser = await userCollection.findOne(query);
      if (existinguser) {
        return res.send({ message: 'User Already exist' })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    })
    app.get('/booking', async (req, res) => {
      const result = await bookingCollection.find().toArray();
      res.send(result)
    })
    app.put('/booking/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      const updatereview = req.body;

      // Ensure approximateDeliveryDate is set correctly
      let approximateDeliveryDate = updatereview.approximatedDeliveryDate;

      // If it's missing, calculate it from deliveryDate
      if (!approximateDeliveryDate && updatereview.deliveryDate) {
        const date = new Date(updatereview.deliveryDate);
        date.setDate(date.getDate() + 3);
        approximateDeliveryDate = date.toISOString().split('T')[0]; // Ensure valid format
      }

      const update = {
        $set: {

          phone: updatereview.phone,
          parcelType: updatereview.parcelType,
          parcelWeight: updatereview.parcelWeight,
          receiverName: updatereview.receiverName,
          receiverPhone: updatereview.receiverPhone,
          deliveryAddress: updatereview.deliveryAddress,
          approximatedDeliveryDate: approximateDeliveryDate, // ✅ Ensure this is never undefined
          bookingDate: updatereview.bookingDate,
          deliveryMenId: updatereview.deliveryMenId || 'unassigned', // Default if not provided
          deliveryDate: updatereview.deliveryDate,
          latitude: updatereview.latitude,
          longitude: updatereview.longitude,
        }
      };


      const result = await bookingCollection.updateOne(filter, update, option);
      res.send(result);
    });
    app.put('/bookingg/:id',verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = req.body;
      const filter = { _id: new ObjectId(id) };
      const option = { upsert: true };
      console.log(query)
      const update = {
        $set: {
          deliveryManId: query.deliveryManId,
          status: "On The Way",

        }
      };


      const result = await bookingCollection.updateOne(filter, update, option);
      res.send(result);
    });
    app.put('/bookingstatus/:id', async (req, res) => {
      const { id } = req.params;  // Get the booking ID from the URL parameter
      const { status } = req.body;  // Get the status from the request body (e.g., "Delivered" or "Cancelled")

      // Check if status is provided
      if (!status) {
        return res.status(400).send({ message: 'Status is required' });
      }

      const filter = { _id: new ObjectId(id) };  // Filter for the booking using its ID
      const update = {
        $set: {
          status: status,  // Update the status with the provided value
        }
      };

      try {
        const result = await bookingCollection.updateOne(filter, update);

        if (result.modifiedCount > 0) {
          // If the update was successful
          res.status(200).send({ message: `Booking status updated to ${status}.` });
        } else {
          // If no document was updated, either because it didn't exist or the status was already the same
          res.status(404).send({ message: 'Booking not found or status already updated.' });
        }
      } catch (error) {
        res.status(500).send({ message: 'Error updating booking status', error: error.message });
      }
    });
    
    app.delete('/booking/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await bookingCollection.deleteOne(query);
      res.send(result)
    })
    app.get('/user', verifyToken, async (req, res) => {
      console.log(req.headers)
      const result = await userCollection.find().toArray();
      res.send(result)
    })
    app.post('/review', async (req, res) => {

      const user = req.body;
      const result = await reviewCollection.insertOne(user);
      res.send(result);
    })
    app.get('/bookingmail',verifyToken, async (req, res) => {
      const email = req.query.email;
      console.log(email)
      const query = { email: email }
      const result = await bookingCollection.find(query).toArray();
      res.send(result)
    })
    app.get('/usermail', async (req, res) => {
      const email = req.query.email;
      console.log(email)
      const query = { email: email }
      const result = await userCollection.find(query).toArray();
      res.send(result)
    })
    app.get('/reviewmail',verifyToken, async (req, res) => {
      const id = req.query.id;
      console.log(id)
      const query = { deliveryManId: id }
      console.log(id, query)
      const result = await reviewCollection.find(query).toArray();
      res.send(result)
    })
    app.patch('/user/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })
    app.patch('/user/driver/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: 'driver'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result)
    })
    app.get('/bookingstatus', async (req, res) => {
      const status = decodeURIComponent(req.query.status); // Decoding the query parameter
      console.log('Status:', status); // Logs the decoded status query parameter
      const query = { status: status };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });
    app.get('/bookingdelivery', async (req, res) => {
      const deliverymanid = req.query.deliverymanid;

      let query = {};

      if (deliverymanid !== "unassigned") {
        query = { deliveryManId: deliverymanid };
      } else {
        query = { deliveryManId: { $exists: false } };
      }

      const result = await bookingCollection.find(query).toArray();

      res.send(result);
    });

    app.get('/userrole',verifyToken, async (req, res) => {
      const role = req.query.role;
      console.log(role)
      const query = { role: role }
      const result = await userCollection.find(query).toArray();
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    //await client.db("admin").command({ ping: 1 });
    //console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    //await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('parcel maker!!')
})

app.listen(port, () => {
  console.log('parcel cooking!!')
})