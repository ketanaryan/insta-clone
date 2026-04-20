let express = require("express");
let cors = require("cors");
let {MongoClient, ObjectId} = require("mongodb");
let multer = require("multer");
let path = require("path");
let fs = require("fs");
let cloudinary = require("cloudinary").v2;
let {CloudinaryStorage} = require("multer-storage-cloudinary");
require("dotenv").config();

let app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const url = process.env.MONGODB_URL || 'mongodb://0.0.0.0:27017';
const port = process.env.PORT || 3000;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET
});

let storage = new CloudinaryStorage({ cloudinary });
let recep = multer({ storage });

// ─── Helper: get a connected db ───────────────────────────────────────────────
async function getDb() {
  const client = new MongoClient(url);
  await client.connect();
  return { client, db: client.db("tinder") };
}

// ─── Helper: create a notification ────────────────────────────────────────────
async function createNotification(db, { recipientUsername, senderUsername, type, postId, message }) {
  if (recipientUsername === senderUsername) return; // don't notify yourself
  const notifications = db.collection("notifications");
  await notifications.insertOne({
    recipientUsername,
    senderUsername,
    type,
    postId: postId || null,
    message,
    isRead: false,
    createdAt: new Date().toISOString()
  });
}

// ─── Health ────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.json({ message: "InstaVibe Backend is running!" }));

// ─── Upload Post ───────────────────────────────────────────────────────────────
app.post("/upload", recep.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    if (!req.body.username) return res.status(400).json({ error: "Username is required" });

    const { client, db } = await getDb();
    const obj = {
      username: req.body.username,
      caption: req.body.caption || "",
      file_url: req.file.path,
      file_name: req.file.filename,
      upload_time: new Date()
    };
    const result = await db.collection("photos").insertOne(obj);
    client.close();
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Upload error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── Get Posts ─────────────────────────────────────────────────────────────────
// ─── Privacy Helper ───
async function canAccess(db, targetUsername, currentUsername) {
  if (!targetUsername || targetUsername === currentUsername) return true;
  const user = await db.collection("users").findOne({ username: targetUsername });
  if (!user || !user.isPrivate) return true;
  return (user.followers || []).includes(currentUsername);
}

// ─── Get Posts ─────────────────────────────────────────────────────────────────
app.get("/files", async (req, res) => {
  try {
    const { client, db } = await getDb();
    const queryUsername = req.query.username;
    const currentUsername = req.query.currentUsername; // Passed from frontend

    if (queryUsername) {
      const allowed = await canAccess(db, queryUsername, currentUsername);
      if (!allowed) {
        client.close();
        return res.status(403).json({ error: "Private account", isPrivate: true });
      }
      
      const result = await db.collection("photos").aggregate([
        { $match: { username: queryUsername } },
        {
          $lookup: {
            from: "users",
            localField: "username",
            foreignField: "username",
            as: "author"
          }
        },
        { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            "author.password": 0,
            "author.email": 0
          }
        },
        { $sort: { upload_time: -1 } }
      ]).toArray();

      client.close();
      return res.json(result);
    } else {
      // Feed view: exclude posts from private accounts that you don't follow
      let following = [];
      if (currentUsername) {
        const user = await db.collection("users").findOne({ username: currentUsername });
        following = user?.following || [];
      }
      
      const privateUsers = await db.collection("users").find({ isPrivate: true }).toArray();
      const privateUsernames = privateUsers.map(u => u.username).filter(u => u !== currentUsername && !following.includes(u));

      const result = await db.collection("photos").aggregate([
        { $match: { username: { $nin: privateUsernames } } },
        {
          $lookup: {
            from: "users",
            localField: "username",
            foreignField: "username",
            as: "author"
          }
        },
        { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            "author.password": 0,
            "author.email": 0
          }
        },
        { $sort: { upload_time: -1 } }
      ]).toArray();
      
      client.close();
      res.json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Delete Post ───────────────────────────────────────────────────────────────
app.delete("/delete/:id", async (req, res) => {
  try {
    const id = req.params.id;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ error: "Invalid ID" });

    const { client, db } = await getDb();
    const _id = new ObjectId(id);
    const post = await db.collection("photos").findOne({ _id });
    if (!post) { client.close(); return res.status(404).json({ error: "Post not found" }); }

    await cloudinary.uploader.destroy(post.file_name);
    await db.collection("photos").deleteOne({ _id });
    client.close();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Like / Unlike a Post ──────────────────────────────────────────────────────
// ─── Like / Unlike a Post ──────────────────────────────────────────────────────
app.post("/post/:id/like", async (req, res) => {
  try {
    const id = req.params.id;
    const { username } = req.body;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ error: "Invalid ID" });
    if (!username) return res.status(400).json({ error: "Username required" });

    const { client, db } = await getDb();
    const _id = new ObjectId(id);
    const post = await db.collection("photos").findOne({ _id });
    if (!post) { client.close(); return res.status(404).json({ error: "Post not found" }); }

    // Privacy Check
    const allowed = await canAccess(db, post.username, username);
    if (!allowed) {
      client.close();
      return res.status(403).json({ error: "Follow to like" });
    }

    let likes = post.likes || [];
    const isLiking = !likes.includes(username);
    if (isLiking) {
      likes.push(username);
      // Create notification for post owner
      await createNotification(db, {
        recipientUsername: post.username,
        senderUsername: username,
        type: "like",
        postId: id,
        message: `${username} liked your post.`
      });
    } else {
      likes = likes.filter(u => u !== username);
    }

    await db.collection("photos").updateOne({ _id }, { $set: { likes } });
    client.close();
    res.json({ success: true, likes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Add Comment ───────────────────────────────────────────────────────────────
// ─── Add Comment ───────────────────────────────────────────────────────────────
app.post("/post/:id/comment", async (req, res) => {
  try {
    const id = req.params.id;
    const { username, text } = req.body;
    if (!id.match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ error: "Invalid ID" });
    if (!username || !text) return res.status(400).json({ error: "Username and text required" });

    const { client, db } = await getDb();
    const _id = new ObjectId(id);
    const post = await db.collection("photos").findOne({ _id });
    if (!post) { client.close(); return res.status(404).json({ error: "Post not found" }); }

    // Privacy Check
    const allowed = await canAccess(db, post.username, username);
    if (!allowed) {
      client.close();
      return res.status(403).json({ error: "Follow to comment" });
    }

    const comment = { username, text, createdAt: new Date().toISOString(), id: new ObjectId().toString() };
    await db.collection("photos").updateOne({ _id }, { $push: { comments: comment } });

    // Notify post owner
    await createNotification(db, {
      recipientUsername: post.username,
      senderUsername: username,
      type: "comment",
      postId: id,
      message: `${username} commented: "${text.slice(0, 40)}${text.length > 40 ? '…' : ''}"`
    });

    const updated = await db.collection("photos").findOne({ _id });
    client.close();
    res.json({ success: true, comments: updated.comments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Get Profile ───────────────────────────────────────────────────────────────
app.get("/profile/:username", async (req, res) => {
  try {
    const { client, db } = await getDb();
    const profile = await db.collection("users").findOne({ username: req.params.username });
    client.close();
    res.json(profile || {
      username: req.params.username,
      bio: "Hello! Welcome to my profile. 🌟",
      pfp_url: "",
      isPrivate: false,
      followers: [],
      following: [],
      followRequests: []
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Update Profile ────────────────────────────────────────────────────────────
app.post("/profile/update", recep.single("pfp"), async (req, res) => {
  try {
    if (!req.body.username) return res.status(400).json({ error: "Username required" });

    let updateData = {};
    if (req.body.bio !== undefined) updateData.bio = req.body.bio;
    if (req.body.isPrivate !== undefined) updateData.isPrivate = req.body.isPrivate === 'true';
    if (req.file) { updateData.pfp_url = req.file.path; updateData.pfp_name = req.file.filename; }

    const { client, db } = await getDb();
    await db.collection("users").updateOne(
      { username: req.body.username },
      { $set: updateData },
      { upsert: true }
    );
    const updated = await db.collection("users").findOne({ username: req.body.username });
    client.close();
    res.json({ success: true, profile: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Follow / Unfollow (Public Account) ──────────────────────────────────────
app.post("/follow", async (req, res) => {
  try {
    const { currentUsername, targetUsername } = req.body;
    if (!currentUsername || !targetUsername) return res.status(400).json({ error: "Missing usernames" });
    if (currentUsername === targetUsername) return res.status(400).json({ error: "Cannot follow yourself" });

    const { client, db } = await getDb();
    const usersCol = db.collection("users");

    const currentUser = await usersCol.findOne({ username: currentUsername });
    const targetUser = await usersCol.findOne({ username: targetUsername });

    const following = currentUser?.following || [];
    const isFollowing = following.includes(targetUsername);

    // If target is private and we're not already following, send a request instead
    if (targetUser?.isPrivate && !isFollowing) {
      // Check if already requested
      const sentRequests = currentUser?.sentRequests || [];
      if (sentRequests.includes(targetUsername)) {
        // Cancel the request
        await usersCol.updateOne({ username: currentUsername }, { $pull: { sentRequests: targetUsername } });
        await usersCol.updateOne({ username: targetUsername }, { $pull: { followRequests: currentUsername } });
        client.close();
        return res.json({ success: true, status: "request_cancelled" });
      }
      // Send request
      await usersCol.updateOne({ username: currentUsername }, { $push: { sentRequests: targetUsername } }, { upsert: true });
      await usersCol.updateOne({ username: targetUsername }, { $push: { followRequests: currentUsername } }, { upsert: true });
      await createNotification(db, {
        recipientUsername: targetUsername,
        senderUsername: currentUsername,
        type: "follow_request",
        message: `${currentUsername} sent you a follow request.`
      });
      client.close();
      return res.json({ success: true, status: "requested" });
    }

    if (isFollowing) {
      await usersCol.updateOne({ username: currentUsername }, { $pull: { following: targetUsername } });
      await usersCol.updateOne({ username: targetUsername }, { $pull: { followers: currentUsername } });
      client.close();
      return res.json({ success: true, status: "unfollowed", isFollowing: false });
    } else {
      await usersCol.updateOne({ username: currentUsername }, { $push: { following: targetUsername } }, { upsert: true });
      await usersCol.updateOne({ username: targetUsername }, { $push: { followers: currentUsername } }, { upsert: true });
      await createNotification(db, {
        recipientUsername: targetUsername,
        senderUsername: currentUsername,
        type: "follow",
        message: `${currentUsername} started following you.`
      });
      client.close();
      return res.json({ success: true, status: "followed", isFollowing: true });
    }
  } catch (error) {
    console.error("Follow error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ─── Accept Follow Request ─────────────────────────────────────────────────────
app.post("/accept-request", async (req, res) => {
  try {
    const { currentUsername, requesterUsername } = req.body;
    const { client, db } = await getDb();
    const usersCol = db.collection("users");

    // Remove from request lists
    await usersCol.updateOne({ username: currentUsername }, { $pull: { followRequests: requesterUsername } });
    await usersCol.updateOne({ username: requesterUsername }, { $pull: { sentRequests: currentUsername } });

    // Add to followers / following
    await usersCol.updateOne({ username: currentUsername }, { $push: { followers: requesterUsername } }, { upsert: true });
    await usersCol.updateOne({ username: requesterUsername }, { $push: { following: currentUsername } }, { upsert: true });

    await createNotification(db, {
      recipientUsername: requesterUsername,
      senderUsername: currentUsername,
      type: "follow_accept",
      message: `${currentUsername} accepted your follow request.`
    });

    client.close();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Reject Follow Request ─────────────────────────────────────────────────────
app.post("/reject-request", async (req, res) => {
  try {
    const { currentUsername, requesterUsername } = req.body;
    const { client, db } = await getDb();
    const usersCol = db.collection("users");

    await usersCol.updateOne({ username: currentUsername }, { $pull: { followRequests: requesterUsername } });
    await usersCol.updateOne({ username: requesterUsername }, { $pull: { sentRequests: currentUsername } });

    client.close();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Get Notifications ──────────────────────────────────────────────────────────
app.get("/notifications/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { client, db } = await getDb();
    
    // Join with users to get latest pfp_url for senderUsername
    const notifications = await db.collection("notifications").aggregate([
      { $match: { recipientUsername: username } },
      { $sort: { createdAt: -1 } },
      { $limit: 50 },
      {
        $lookup: {
          from: "users",
          localField: "senderUsername",
          foreignField: "username",
          as: "senderInfo"
        }
      },
      { $unwind: { path: "$senderInfo", preserveNullAndEmptyArrays: true } }
    ]).toArray();
    
    client.close();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Mark Notification as Read ─────────────────────────────────────────────────
app.patch("/notifications/read/:id", async (req, res) => {
  try {
    const { client, db } = await getDb();
    await db.collection("notifications").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { isRead: true } }
    );
    client.close();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Mark ALL notifications as read ────────────────────────────────────────────
app.patch("/notifications/read-all/:username", async (req, res) => {
  try {
    const { client, db } = await getDb();
    await db.collection("notifications").updateMany(
      { recipientUsername: req.params.username, isRead: false },
      { $set: { isRead: true } }
    );
    client.close();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export app for Vercel Serverless
module.exports = app;

if (!process.env.VERCEL) {
  app.listen(port, '0.0.0.0', () => console.log(`InstaVibe backend running on port ${port}`));
}

// ─── Search Users (For starting a chat) ──────────────────────────────────────
app.get("/users/search", async (req, res) => {
  try {
    const { q } = req.query;
    const { client, db } = await getDb();
    const query = q ? { username: { $regex: q, $options: "i" } } : {};
    const users = await db.collection("users").find(query).limit(10).toArray();
    client.close();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Conversations ───────────────────────────────────────────────────────────
app.post("/conversations", async (req, res) => {
  try {
    const { sender, receiver } = req.body;
    const { client, db } = await getDb();
    const conversations = db.collection("conversations");
    
    // Check if conversation already exists
    let conversation = await conversations.findOne({
      members: { $all: [sender, receiver] }
    });

    if (!conversation) {
      const newConversation = {
        members: [sender, receiver],
        updatedAt: new Date().toISOString(),
        lastMessage: ""
      };
      const result = await conversations.insertOne(newConversation);
      conversation = { ...newConversation, _id: result.insertedId };
    }

    client.close();
    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/conversations/:username", async (req, res) => {
  try {
    const { client, db } = await getDb();
    const conversations = await db.collection("conversations")
      .find({ members: { $in: [req.params.username] } })
      .sort({ updatedAt: -1 })
      .toArray();
    
    // Enrich conversation with other user's info and unread count
    const enrichedConversations = await Promise.all(conversations.map(async (conv) => {
      const otherUsername = conv.members.find(m => m !== req.params.username);
      const otherUser = await db.collection("users").findOne({ username: otherUsername });
      
      const unreadCount = await db.collection("messages").countDocuments({
        conversationId: conv._id,
        receiver: req.params.username,
        isRead: false
      });

      return {
        ...conv,
        otherUser: otherUser || { username: otherUsername, pfp_url: "" },
        unreadCount
      };
    }));

    client.close();
    res.json(enrichedConversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/messages/unread-total/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { client, db } = await getDb();
    const total = await db.collection("messages").countDocuments({
      receiver: username,
      isRead: false
    });
    client.close();
    res.json({ total });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Messages ───────────────────────────────────────────────────────────────
app.post("/messages", recep.single("image"), async (req, res) => {
  try {
    const { conversationId, sender, receiver, text } = req.body;
    let image_url = "";
    if (req.file) {
      image_url = req.file.path;
    }

    const { client, db } = await getDb();
    const newMessage = {
      conversationId: new ObjectId(conversationId),
      sender,
      receiver,
      text: text || "",
      image: image_url,
      createdAt: new Date().toISOString(),
      isRead: false
    };
    
    await db.collection("messages").insertOne(newMessage);
    
    // Update conversation's last message and updatedAt
    await db.collection("conversations").updateOne(
      { _id: new ObjectId(conversationId) },
      { 
        $set: { 
          lastMessage: text || "Sent an image", 
          updatedAt: new Date().toISOString() 
        } 
      }
    );

    client.close();
    res.json(newMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/messages/:conversationId", async (req, res) => {
  try {
    const { client, db } = await getDb();
    const messages = await db.collection("messages")
      .find({ conversationId: new ObjectId(req.params.conversationId) })
      .sort({ createdAt: 1 })
      .toArray();
    client.close();
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/messages/read/:conversationId", async (req, res) => {
  try {
    const { username } = req.body;
    const { client, db } = await getDb();
    await db.collection("messages").updateMany(
      { 
        conversationId: new ObjectId(req.params.conversationId),
        receiver: username,
        isRead: false 
      },
      { $set: { isRead: true } }
    );
    client.close();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Stories ───────────────────────────────────────────────────────────────────
app.post("/stories/upload", recep.single("image"), async (req, res) => {
  try {
    const { username } = req.body;
    if (!req.file) return res.status(400).json({ error: "No image provided" });

    const { client, db } = await getDb();
    const newStory = {
      username,
      image: req.file.path, // Cloudinary URL
      createdAt: new Date().toISOString()
    };
    
    await db.collection("stories").insertOne(newStory);
    client.close();
    res.json({ success: true, story: newStory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/stories", async (req, res) => {
  try {
    const { username } = req.query;
    const { client, db } = await getDb();
    
    // 1. Get current user's following list
    const user = await db.collection("users").findOne({ username });
    const following = user?.following || [];
    const allowedUsernames = [username, ...following];

    // 2. Filter by 24h expiry
    const expiryTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 3. Aggregate stories with user info
    const stories = await db.collection("stories").aggregate([
      { 
        $match: { 
          username: { $in: allowedUsernames },
          createdAt: { $gte: expiryTime }
        } 
      },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: "users",
          localField: "username",
          foreignField: "username",
          as: "author"
        }
      },
      { $unwind: { path: "$author", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          "author.password": 0,
          "author.email": 0
        }
      }
    ]).toArray();

    client.close();
    res.json(stories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Session Tracking ──────────────────────────────────────────────────────────
app.post("/session/start", async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: "Username required" });
    const { client, db } = await getDb();
    const result = await db.collection("session_logs").insertOne({
      username,
      startTime: new Date().toISOString(),
      endTime: null
    });
    client.close();
    res.json({ success: true, sessionId: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/session/end", async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: "SessionId required" });
    const { client, db } = await getDb();
    await db.collection("session_logs").updateOne(
      { _id: new ObjectId(sessionId) },
      { $set: { endTime: new Date().toISOString() } }
    );
    client.close();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Your Activity ─────────────────────────────────────────────────────────────
app.get("/activity/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { client, db } = await getDb();
    
    // 1. Liked Posts
    const likedPosts = await db.collection("photos")
      .find({ likes: username })
      .sort({ upload_time: -1 })
      .toArray();

    // 2. Comments
    const postsWithComments = await db.collection("photos")
      .find({ "comments.username": username })
      .sort({ upload_time: -1 })
      .toArray();
    
    let userComments = [];
    postsWithComments.forEach(post => {
      post.comments.forEach(c => {
        if (c.username === username) {
          userComments.push({
            ...c,
            postId: post._id,
            postImage: post.file_url
          });
        }
      });
    });

    // 3. Time Spent
    const sessions = await db.collection("session_logs")
      .find({ username, endTime: { $ne: null } })
      .toArray();
    
    let totalMinutes = 0;
    sessions.forEach(s => {
      const duration = (new Date(s.endTime) - new Date(s.startTime)) / 1000 / 60;
      totalMinutes += duration;
    });

    client.close();
    res.json({
      likedPosts,
      comments: userComments,
      timeSpent: {
        totalMinutes: Math.round(totalMinutes),
        sessionsCount: sessions.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Account Privacy ──────────────────────────────────────────────────────────
app.patch("/profile/privacy", async (req, res) => {
  try {
    const { username, isPrivate } = req.body;
    const { client, db } = await getDb();
    await db.collection("users").updateOne(
      { username },
      { $set: { isPrivate } },
      { upsert: true }
    );
    client.close();
    res.json({ success: true, isPrivate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});