const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient } = require("mongodb");
const admin = require("firebase-admin");
const ObjectId = require("mongodb").ObjectId;

const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

app.use(cors());
app.use(express.json());
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k5fmm.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];

    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("Car-2021");
    const carsCollection = database.collection("cars");
    const usersCollection = database.collection("users");
    const usersOrderCollection = database.collection("usersOrder");
    const usersReviewCollection = database.collection("usersReview");

    // Reviews
    // Get Users Reviews
    app.get("/usersReview", async (req, res) => {
      const cursor = usersReviewCollection.find({});
      const cars = await cursor.toArray();
      res.send(cars);
    });
    // Post Users Reviews
    app.post("/usersReview", async (req, res) => {
      const userOrder = req.body;
      const result = await usersReviewCollection.insertOne(userOrder);
      res.json(result);
    });
    // Post Cars
    app.post("/cars", async (req, res) => {
      const appointment = req.body;
      const result = await carsCollection.insertOne(appointment);
      res.json(result);
    });
    // Get Cars
    app.get("/cars", async (req, res) => {
      const cursor = carsCollection.find({});
      const cars = await cursor.toArray();
      res.send(cars);
    });
    // Get Single Cars
    app.get("/cars/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const user = await carsCollection.findOne(query);
      res.send(user);
    });
    // // Delete User Services
    app.delete("/cars/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await carsCollection.deleteOne(query);
      res.json(result);
    });
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      console.log(result);
      res.json(result);
    });

    app.put("/users", async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      const options = { upsert: true };
      const updateDoc = { $set: user };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });
    // Make Admin
    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === "admin") {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: "admin" } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      } else {
        res
          .status(403)
          .json({ message: "you do not have access to make admin" });
      }
    });
    // Get Users Order By Clients
    app.get("/usersOrder", verifyToken, async (req, res) => {
      const cursor = usersOrderCollection.find({});
      const userOrder = await cursor.toArray();
      res.json(userOrder);
    });
    // Post Users Order By Clients
    app.post("/usersOrder", async (req, res) => {
      const userOrder = req.body;
      const result = await usersOrderCollection.insertOne(userOrder);
      res.json(result);
    });
    // Get Single Users Services by Admin
    app.get("/usersOrder/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const user = await usersOrderCollection.findOne(query);
      res.send(user);
    });
    // // Delete User Services by Admin
    app.delete("/usersOrder/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersOrderCollection.deleteOne(query);
      res.json(result);
    });
    //Update Users
    // app.put("/userOrder/:id", async (req, res) => {
    //   const id = req.params.id;
    //   const updatedUser = req.body;
    //   const filter = { _id: ObjectId(id) };
    //   const options = { upsert: true };
    //   const updateDoc = {
    //     $set: {
    //       name: updatedUser.name,
    //       email: updatedUser.email,
    //     },
    //   };
    //   const result = await usersOrderCollection.updateOne(
    //     filter,
    //     updateDoc,
    //     options
    //   );
    //   console.log("updating", id);
    //   res.json(result);
    // });
  } finally {
    // await client.close();
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Cars-2021");
});

app.listen(port, () => {
  console.log(`listening at ${port}`);
});
