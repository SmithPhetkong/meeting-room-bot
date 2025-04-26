const express = require("express");
const dotenv = require("dotenv");
const { MongoClient, ObjectId } = require("mongodb"); // เพิ่มการ import ObjectId
const line = require("@line/bot-sdk");
const moment = require("moment-timezone");

// Configure dotenv
dotenv.config();

const app = express();

// Line bot configuration
const lineConfig = {
  channelAccessToken: process.env.ACCESS_TOKEN,
  channelSecret: process.env.SECRET_TOKEN,
};
const client = new line.Client(lineConfig);

// MongoDB collections
let bookingsCollection, roomsCollection, adminCollection;

// Initialize MongoDB connection
const initializeMongoDB = async () => {
  try {
    const clientMongo = new MongoClient(process.env.MONGODB_URI, {
      useUnifiedTopology: true,
    });
    await clientMongo.connect();
    console.log("Connected to MongoDB Atlas");
    const db = clientMongo.db("RUMA"); // Replace "RUMA" with your database name
    bookingsCollection = db.collection("bookings");
    roomsCollection = db.collection("rooms");
    adminCollection = db.collection("admins");
  } catch (error) {
    console.error("Error connecting to MongoDB Atlas:", error);
    process.exit(1);
  }
};
initializeMongoDB();

// Function to insert booking data into MongoDB
const saveBookingToMongoDB = async (bookingData) => {
  try {
    // บันทึกข้อมูลการจองลงใน MongoDB (collection "bookings")
    const result = await bookingsCollection.insertOne({
      ...bookingData,
      createdAt: new Date(), // วันที่สร้างการจอง
      updatedAt: new Date(), // วันที่อัปเดตการจอง
    });
    console.log("Booking saved successfully:", result);
  } catch (error) {
    console.error("Error saving booking to MongoDB:", error);
  }
};

// Function to cancel booking
const cancelBooking = async (bookingId) => {
  try {
    const result = await bookingsCollection.deleteOne({ bookingId });
    return result.deletedCount > 0; // คืนค่า true ถ้าลบสำเร็จ
  } catch (error) {
    console.error("Error canceling booking:", error);
    return false;
  }
};

// Function to view bookings by email
const viewMyBookings = async (email) => {
  try {
    const bookings = await bookingsCollection.find({ email }).toArray();
    return bookings;
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return [];
  }
};

// Function to create booking confirmation Flex Message
const createBookingConfirmationFlexMessage = (bookingData) => {
  return {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: "ยืนยันการจองห้องประชุม",
          weight: "bold",
          size: "lg",
          color: "#1DB446",
        },
        {
          type: "text",
          text: `รหัสการจอง: ${bookingData.bookingId}`,
          size: "sm",
          color: "#666666",
          wrap: true,
        },
        {
          type: "text",
          text: `ห้อง: ${bookingData.room}`,
          size: "sm",
          color: "#666666",
          wrap: true,
        },
        {
          type: "text",
          text: `วันที่: ${bookingData.date}`,
          size: "sm",
          color: "#666666",
          wrap: true,
        },
        {
          type: "text",
          text: `เวลา: ${bookingData.startTime} - ${bookingData.endTime}`,
          size: "sm",
          color: "#666666",
          wrap: true,
        },
        {
          type: "text",
          text: `หัวข้อ: ${bookingData.meetingTopic}`,
          size: "sm",
          color: "#666666",
          wrap: true,
        },
        {
          type: "text",
          text: `ผู้จอง: ${bookingData.reserverName}`,
          size: "sm",
          color: "#666666",
          wrap: true,
        },
        {
          type: "text",
          text: `อีเมล: ${bookingData.email}`,
          size: "sm",
          color: "#666666",
          wrap: true,
        },
      ],
    },
  };
};

// ฟังก์ชันสร้างข้อความยืนยันการจองพร้อมปุ่ม
const createBookingConfirmationMessage = (bookingData) => {
  return {
    type: "flex",
    altText: "ยืนยันการจอง",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "✅ การจองเสร็จสมบูรณ์!",
            weight: "bold",
            size: "lg",
            color: "#1DB446",
          },
          {
            type: "text",
            text: `📅 วันที่: ${bookingData.date}`,
            size: "sm",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: `🕒 เวลา: ${bookingData.startTime} - ${bookingData.endTime}`,
            size: "sm",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: `🏢 ห้อง: ${bookingData.room}`,
            size: "sm",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: `📋 หัวข้อ: ${bookingData.meetingTopic}`,
            size: "sm",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: `👤 ผู้จอง: ${bookingData.reserverName}`,
            size: "sm",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: `📞 เบอร์โทร: ${bookingData.phoneNumber}`,
            size: "sm",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: `👥 ผู้เข้าร่วม: ${bookingData.numberOfAttendees}`,
            size: "sm",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: `🎯 อุปกรณ์เสริม: ${bookingData.additionalEquipment}`,
            size: "sm",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: `📧 อีเมล: ${bookingData.email}`,
            size: "sm",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: `🔑 รหัสการจอง: ${bookingData.bookingId}`,
            size: "sm",
            color: "#666666",
            wrap: true,
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#007BFF",
            action: {
              type: "postback",
              label: "ยืนยันการจอง",
              data: `action=confirmBooking&bookingId=${bookingData.bookingId}`,
            },
          },
        ],
      },
    },
  };
};

// ฟังก์ชันสร้างข้อความสรุปการจองพร้อมปุ่ม
const createBookingSummaryMessage = (bookingData) => {
  return {
    type: "flex",
    altText: "สรุปการจอง",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "📋 สรุปการจองห้องประชุม",
            weight: "bold",
            size: "lg",
            color: "#1DB446",
          },
          {
            type: "text",
            text: `📅 วันที่: ${bookingData.date}`,
            size: "sm",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: `🕒 เวลา: ${bookingData.startTime} - ${bookingData.endTime}`,
            size: "sm",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: `🏢 ห้อง: ${bookingData.room}`,
            size: "sm",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: `📋 หัวข้อ: ${bookingData.meetingTopic}`,
            size: "sm",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: `👤 ผู้จอง: ${bookingData.reserverName}`,
            size: "sm",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: `📞 เบอร์โทร: ${bookingData.phoneNumber}`,
            size: "sm",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: `👥 ผู้เข้าร่วม: ${bookingData.numberOfAttendees}`,
            size: "sm",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: `🎯 อุปกรณ์เสริม: ${bookingData.additionalEquipment}`,
            size: "sm",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: `📧 อีเมล: ${bookingData.email}`,
            size: "sm",
            color: "#666666",
            wrap: true,
          },
          {
            type: "text",
            text: `🔑 รหัสการจอง: ${bookingData.bookingId}`,
            size: "sm",
            color: "#666666",
            wrap: true,
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#007BFF",
            action: {
              type: "postback",
              label: "ยืนยันการจอง",
              data: `action=confirmBooking&bookingId=${bookingData.bookingId}`,
            },
          },
        ],
      },
    },
  };
};

// Session storage
const session = {};

// คำถามที่ต้องถามผู้ใช้
const questions = [
  { key: "meetingTopic", text: "กรุณาระบุหัวข้อการประชุม" },
  { key: "reserverName", text: "กรุณาระบุชื่อผู้จอง" },
  { key: "phoneNumber", text: "กรุณาระบุหมายเลขโทรศัพท์" },
  { key: "numberOfAttendees", text: "กรุณาระบุจำนวนผู้เข้าร่วมประชุม" },
  {
    key: "additionalEquipment",
    text: "ต้องการอุปกรณ์เพิ่มเติมหรือไม่ (เช่น โปรเจคเตอร์)",
  },
  { key: "email", text: "กรุณาระบุอีเมลสำหรับการติดต่อ" },
];

// คำถามสำหรับการแก้ไขข้อมูลการจอง
const editQuestions = [
  { key: "meetingTopic", text: "กรุณาระบุหัวข้อการประชุมใหม่" },
  { key: "numberOfAttendees", text: "กรุณาระบุจำนวนผู้เข้าร่วมประชุมใหม่" },
  { key: "additionalEquipment", text: "กรุณาระบุอุปกรณ์เพิ่มเติมใหม่ (ถ้ามี)" },
  { key: "reserverName", text: "กรุณาระบุชื่อผู้จองใหม่" },
  { key: "phoneNumber", text: "กรุณาระบุหมายเลขโทรศัพท์ใหม่" },
  { key: "email", text: "กรุณาระบุอีเมลใหม่" },
];

// ฟังก์ชันสร้างรหัสการจอง
const generateBookingId = () => {
  const datePart = moment().format("YYYYMMDD");
  const randomPart = Math.floor(100 + Math.random() * 900); // ตัวเลขสุ่ม 3 หลัก
  return `${datePart}-${randomPart}`;
};

// ฟังก์ชันถามคำถามถัดไป
const askNextQuestion = (userId, replyToken) => {
  const userSession = session[userId];
  const currentQuestionIndex = userSession.currentQuestionIndex || 0;

  if (currentQuestionIndex < questions.length) {
    const question = questions[currentQuestionIndex];
    userSession.currentQuestionIndex = currentQuestionIndex + 1;

    return client.replyMessage(replyToken, {
      type: "text",
      text: question.text,
    });
  } else {
    // เมื่อถามคำถามครบแล้ว เพิ่มรหัสการจองและแสดงสรุปข้อมูล
    userSession.bookingId = generateBookingId(); // เพิ่มรหัสการจอง

    const summaryMessage = createBookingSummaryMessage(userSession);
    return client.replyMessage(replyToken, summaryMessage);
  }
};

// ฟังก์ชันถามคำถามถัดไปสำหรับการแก้ไข
const askNextEditQuestion = (userId, replyToken) => {
  const userSession = session[userId];
  const currentQuestionIndex = userSession.currentQuestionIndex || 0;

  if (currentQuestionIndex < editQuestions.length) {
    const question = editQuestions[currentQuestionIndex];
    userSession.currentQuestionIndex = currentQuestionIndex + 1; // อัปเดต currentQuestionIndex

    return client.replyMessage(replyToken, {
      type: "text",
      text: question.text,
    });
  } else {
    // เมื่อแก้ไขข้อมูลครบแล้ว บันทึกข้อมูลใหม่ลงใน MongoDB
    const updatedBooking = {
      meetingTopic: userSession.meetingTopic,
      numberOfAttendees: userSession.numberOfAttendees,
      additionalEquipment: userSession.additionalEquipment,
      reserverName: userSession.reserverName,
      phoneNumber: userSession.phoneNumber,
      email: userSession.email,
      updatedAt: new Date(),
    };

    bookingsCollection.updateOne(
      { bookingId: userSession.bookingId }, // ใช้ bookingId จาก session
      { $set: updatedBooking }
    )
      .then(() => {
        client.replyMessage(replyToken, {
          type: "text",
          text: "✅ แก้ไขข้อมูลการจองสำเร็จ",
        });
      })
      .catch((error) => {
        console.error("Error updating booking:", error);
        client.replyMessage(replyToken, {
          type: "text",
          text: "❌ เกิดข้อผิดพลาดในการแก้ไขข้อมูล กรุณาลองใหม่อีกครั้ง",
        });
      });
  }
};

const askNextRoomQuestion = (userId, replyToken) => {
  const roomQuestions = [
    { key: "name", text: "กรุณาระบุชื่อห้องประชุม (Name):" },
    { key: "location", text: "กรุณาระบุสถานที่ (Location):" },
    { key: "capacity", text: "กรุณาระบุจำนวนที่รองรับ (Capacity):" },
    { key: "imageUrl", text: "กรุณาระบุ URL รูปภาพ (ImageURL):" },
    { key: "price", text: "กรุณาระบุราคา (Price):" },
  ];

  const userSession = session[userId];
  const currentQuestionIndex = userSession.currentQuestionIndex || 0;

  if (currentQuestionIndex < roomQuestions.length) {
    const question = roomQuestions[currentQuestionIndex];
    userSession.currentQuestionIndex = currentQuestionIndex + 1;

    return client.replyMessage(replyToken, {
      type: "text",
      text: question.text,
    });
  } else {
    // เมื่อถามข้อมูลครบแล้ว บันทึกข้อมูลห้องประชุมลง MongoDB
    const newRoom = {
      name: userSession.name,
      location: userSession.location,
      capacity: parseInt(userSession.capacity, 10),
      imageUrl: userSession.imageUrl,
      price: parseFloat(userSession.price),
      createdAt: new Date(),
    };

    roomsCollection.insertOne(newRoom)
      .then(() => {
        client.replyMessage(replyToken, {
          type: "text",
          text: "✅ เพิ่มห้องประชุมสำเร็จ!",
        });
      })
      .catch((error) => {
        console.error("Error adding room:", error);
        client.replyMessage(replyToken, {
          type: "text",
          text: "❌ เกิดข้อผิดพลาดในการเพิ่มห้องประชุม กรุณาลองใหม่อีกครั้ง",
        });
      });

    // ล้างข้อมูล session
    delete session[userId];
  }
};

// Mock admin credentials (you can replace this with a database or environment variables)
const adminCredentials = {
  username: "admin",
  password: "1234",
};

// Function to handle admin login
const handleAdminLogin = (userId, replyToken, userMessage) => {
  const userSession = session[userId];

  if (!userSession.adminStep) {
    userSession.adminStep = "username";
    return client.replyMessage(replyToken, {
      type: "text",
      text: "กรุณาใส่ Username ของคุณ:",
    });
  }

  if (userSession.adminStep === "username") {
    userSession.adminUsername = userMessage;
    userSession.adminStep = "password";
    return client.replyMessage(replyToken, {
      type: "text",
      text: "กรุณาใส่ Password ของคุณ:",
    });
  }

  if (userSession.adminStep === "password") {
    userSession.adminPassword = userMessage;

    // Check credentials
    if (
      userSession.adminUsername === adminCredentials.username &&
      userSession.adminPassword === adminCredentials.password
    ) {
      userSession.isAdmin = true;
      delete userSession.adminStep;

      // Flex Message สำหรับเมนูแอดมิน
      const adminMenuFlexMessage = {
        type: "flex",
        altText: "เมนูแอดมิน",
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "📋 เมนูแอดมิน",
                weight: "bold",
                size: "lg",
                color: "#1DB446",
              },
              {
                type: "button",
                style: "primary",
                color: "#007BFF",
                action: {
                  type: "postback",
                  label: "📋 ดูรายการจอง",
                  data: "action=viewBookings",
                },
              },
              {
                type: "button",
                style: "primary",
                color: "#28A745",
                action: {
                  type: "postback",
                  label: "➕ เพิ่มห้องประชุม",
                  data: "action=addRoom",
                },
              },
              {
                type: "button",
                style: "primary",
                color: "#FF5733",
                action: {
                  type: "postback",
                  label: "🗑️ ลบห้องประชุม",
                  data: "action=deleteRoom",
                },
              },
              {
                type: "button",
                style: "primary",
                color: "#6C757D",
                action: {
                  type: "postback",
                  label: "➕ เพิ่มแอดมิน",
                  data: "action=addAdmin",
                },
              },
            ],
          },
        },
      };

      return client.replyMessage(replyToken, adminMenuFlexMessage);
    } else {
      delete userSession.adminStep;
      return client.replyMessage(replyToken, {
        type: "text",
        text: "❌ Username หรือ Password ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
      });
    }
  }
};

// ประกาศฟังก์ชัน askNextAdminQuestion ก่อน handleEvent
const askNextAdminQuestion = async (userId, replyToken, userMessage) => {
  const adminQuestions = [
    { key: "username", text: "กรุณาระบุ Username ของแอดมิน:" },
    { key: "password", text: "กรุณาระบุ Password ของแอดมิน:" },
    { key: "email", text: "กรุณาระบุ Email ของแอดมิน:" },
  ];

  const userSession = session[userId] || (session[userId] = {});
  const currentQuestionIndex = userSession.currentQuestionIndex || 0;

  // บันทึกคำตอบของคำถามก่อนหน้า
  if (currentQuestionIndex > 0) {
    const previousQuestion = adminQuestions[currentQuestionIndex - 1];
    userSession[previousQuestion.key] = userMessage;
  }

  if (currentQuestionIndex < adminQuestions.length) {
    const question = adminQuestions[currentQuestionIndex];
    userSession.currentQuestionIndex = currentQuestionIndex + 1;

    // ส่งคำถามถัดไป
    try {
      await client.replyMessage(replyToken, {
        type: "text",
        text: question.text,
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  } else {
    // เมื่อถามครบทุกคำถามแล้ว
    const newAdmin = {
      username: userSession.username,
      password: userSession.password,
      email: userSession.email,
      createdAt: new Date(),
    };

    try {
      await adminCollection.insertOne(newAdmin);
      await client.replyMessage(replyToken, {
        type: "text",
        text: "✅ เพิ่มแอดมินสำเร็จ!",
      });
    } catch (error) {
      console.error("Error adding admin:", error);
      await client.replyMessage(replyToken, {
        type: "text",
        text: "❌ เกิดข้อผิดพลาดในการเพิ่มแอดมิน กรุณาลองใหม่อีกครั้ง",
      });
    }

    // ล้างข้อมูล session
    delete session[userId];
  }
};

// Handle incoming events
const handleEvent = async (event) => {
  if (event.type === "message" && event.message.type === "text") {
    const userMessage = event.message.text;
    const userId = event.source.userId;

    if (!session[userId]) {
      session[userId] = {};
    }

    // เริ่มโหมดเข้าสู่ระบบแอดมิน
    if (userMessage === "เข้าสู่ระบบแอดมิน") {
      session[userId] = { mode: "adminLogin", adminStep: "username" };
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "กรุณาใส่ Username ของคุณ:",
      });
    }

    // ดำเนินการเข้าสู่ระบบแอดมิน
    if (session[userId].mode === "adminLogin") {
      const userSession = session[userId];

      if (userSession.adminStep === "username") {
        userSession.adminUsername = userMessage;
        userSession.adminStep = "password";
        return client.replyMessage(event.replyToken, {
          type: "text",
          text: "กรุณาใส่ Password ของคุณ:",
        });
      }

      if (userSession.adminStep === "password") {
        userSession.adminPassword = userMessage;

        try {
          // ตรวจสอบข้อมูล Username และ Password จาก MongoDB
          const admin = await adminCollection.findOne({
            username: userSession.adminUsername,
            password: userSession.adminPassword, // ควรเข้ารหัส Password ในการใช้งานจริง
          });

          if (admin) {
            userSession.isAdmin = true;
            delete userSession.adminStep;

            // Flex Message สำหรับเมนูแอดมิน
            const adminMenuFlexMessage = {
              type: "flex",
              altText: "เมนูแอดมิน",
              contents: {
                type: "bubble",
                body: {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      text: "📋 เมนูแอดมิน",
                      weight: "bold",
                      size: "lg",
                      color: "#1DB446",
                    },
                    {
                      type: "button",
                      style: "primary",
                      color: "#007BFF",
                      action: {
                        type: "postback",
                        label: "📋 ดูรายการจอง",
                        data: "action=viewBookings",
                      },
                    },
                    {
                      type: "button",
                      style: "primary",
                      color: "#28A745",
                      action: {
                        type: "postback",
                        label: "➕ เพิ่มห้องประชุม",
                        data: "action=addRoom",
                      },
                    },
                    {
                      type: "button",
                      style: "primary",
                      color: "#FF5733",
                      action: {
                        type: "postback",
                        label: "🗑️ ลบห้องประชุม",
                        data: "action=deleteRoom",
                      },
                    },
                    {
                      type: "button",
                      style: "primary",
                      color: "#6C757D",
                      action: {
                        type: "postback",
                        label: "➕ เพิ่มแอดมิน",
                        data: "action=addAdmin",
                      },
                    },
                  ],
                },
              },
            };

            return client.replyMessage(event.replyToken, adminMenuFlexMessage);
          } else {
            delete session[userId];
            return client.replyMessage(event.replyToken, {
              type: "text",
              text: "❌ Username หรือ Password ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง",
            });
          }
        } catch (error) {
          console.error("Error checking admin credentials:", error);
          return client.replyMessage(event.replyToken, {
            type: "text",
            text: "❌ เกิดข้อผิดพลาดในการตรวจสอบข้อมูล กรุณาลองใหม่อีกครั้ง",
          });
        }
      }
    }

    // เริ่มโหมดเพิ่มแอดมิน
    if (userMessage === "เพิ่มแอดมิน") {
      if (!session[userId].isAdmin) {
        return client.replyMessage(event.replyToken, {
          type: "text",
          text: "❌ คุณต้องเข้าสู่ระบบแอดมินก่อนเพื่อเพิ่มแอดมินใหม่",
        });
      }

      session[userId] = { mode: "addAdmin", currentQuestionIndex: 0 };
      return askNextAdminQuestion(userId, event.replyToken);
    }

    // ดำเนินการถามคำถามถัดไปในโหมดเพิ่มแอดมิน
    if (session[userId].mode === "addAdmin") {
      return askNextAdminQuestion(userId, event.replyToken, userMessage);
    }

    if (userMessage === "ยกเลิกการจอง") {
      session[userId] = { mode: "cancel" }; // ตั้งค่าโหมดเป็นยกเลิกการจอง
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "กรุณาระบุรหัสการจองที่ต้องการยกเลิก",
      });
    }
    

    if (session[userId] && session[userId].mode === "cancel") {
      const bookingId = userMessage;

      // ค้นหาข้อมูลการจองใน MongoDB
      const booking = await bookingsCollection.findOne({ bookingId });

      if (!booking) {
        return client.replyMessage(event.replyToken, {
          type: "text",
          text: "ไม่พบข้อมูลการจอง กรุณาตรวจสอบรหัสการจองอีกครั้ง",
        });
      }

      // สร้าง Flex Message แสดงข้อมูลการจองพร้อมปุ่มยกเลิก
      const cancelFlexMessage = {
        type: "flex",
        altText: "ยกเลิกการจอง",
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "ยกเลิกการจอง",
                weight: "bold",
                size: "lg",
                color: "#FF0000",
              },
              {
                type: "text",
                text: `รหัสการจอง: ${booking.bookingId}`,
                size: "sm",
                color: "#666666",
                wrap: true,
              },
              {
                type: "text",
                text: `ห้อง: ${booking.room}`,
                size: "sm",
                color: "#666666",
                wrap: true,
              },
              {
                type: "text",
                text: `วันที่: ${booking.date}`,
                size: "sm",
                color: "#666666",
                wrap: true,
              },
              {
                type: "text",
                text: `เวลา: ${booking.startTime} - ${booking.endTime}`,
                size: "sm",
                color: "#666666",
                wrap: true,
              },
              {
                type: "text",
                text: `หัวข้อ: ${booking.meetingTopic}`,
                size: "sm",
                color: "#666666",
                wrap: true,
              },
              {
                type: "text",
                text: `ผู้จอง: ${booking.reserverName}`,
                size: "sm",
                color: "#666666",
                wrap: true,
              },
              {
                type: "text",
                text: `อีเมล: ${booking.email}`,
                size: "sm",
                color: "#666666",
                wrap: true,
              },
            ],
          },
          footer: {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
              {
                type: "button",
                style: "primary",
                color: "#FF0000",
                action: {
                  type: "postback",
                  label: "ยืนยันการยกเลิก",
                  data: `action=confirmCancel&bookingId=${booking.bookingId}`,
                },
              },
            ],
          },
        },
      };

      return client.replyMessage(event.replyToken, cancelFlexMessage);
    }

    if (session[userId] && session[userId].mode === "new") {
      const userSession = session[userId];
      const currentQuestionIndex = userSession.currentQuestionIndex - 1;

      if (
        currentQuestionIndex >= 0 &&
        currentQuestionIndex < questions.length
      ) {
        const question = questions[currentQuestionIndex];
        userSession[question.key] = userMessage;
      }

      return askNextQuestion(userId, event.replyToken);
    }

    if (userMessage === "ดูรายการจองของฉัน") {
      session[userId] = { mode: "viewBookings" }; // ตั้งค่าโหมดเป็นดูรายการจอง
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "กรุณาระบุอีเมลของคุณเพื่อดูรายการจอง",
      });
    }

    if (session[userId] && session[userId].mode === "viewBookings") {
      const email = userMessage;

      // ค้นหารายการจองใน MongoDB
      const bookings = await viewMyBookings(email);

      if (bookings.length === 0) {
        return client.replyMessage(event.replyToken, {
          type: "text",
          text: "ไม่พบรายการจองสำหรับอีเมลนี้",
        });
      }

      // สร้าง Flex Message สำหรับรายการจอง
      const bookingsFlexMessage = {
        type: "flex",
        altText: "รายการจองของคุณ",
        contents: {
          type: "carousel",
          contents: bookings.map((booking) => ({
            type: "bubble",
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "text",
                  text: "📋 รายละเอียดการจอง",
                  weight: "bold",
                  size: "lg",
                  color: "#1DB446",
                },
                {
                  type: "text",
                  text: `🔑 รหัสการจอง: ${booking.bookingId}`,
                  size: "sm",
                  color: "#666666",
                  wrap: true,
                },
                {
                  type: "text",
                  text: `🏢 ห้อง: ${booking.room}`,
                  size: "sm",
                  color: "#666666",
                  wrap: true,
                },
                {
                  type: "text",
                  text: `📅 วันที่: ${booking.date}`,
                  size: "sm",
                  color: "#666666",
                  wrap: true,
                },
                {
                  type: "text",
                  text: `🕒 เวลา: ${booking.startTime} - ${booking.endTime}`,
                  size: "sm",
                  color: "#666666",
                  wrap: true,
                },
                {
                  type: "text",
                  text: `📋 หัวข้อ: ${booking.meetingTopic}`,
                  size: "sm",
                  color: "#666666",
                  wrap: true,
                },
                {
                  type: "text",
                  text: `👤 ผู้จอง: ${booking.reserverName}`,
                  size: "sm",
                  color: "#666666",
                  wrap: true,
                },
                {
                  type: "text",
                  text: `📧 อีเมล: ${booking.email}`,
                  size: "sm",
                  color: "#666666",
                  wrap: true,
                },
              ],
            },
          })),
        },
      };

      return client.replyMessage(event.replyToken, bookingsFlexMessage);
    }

    if (userMessage === "ค้นหาห้องว่าง") {
      const now = moment().tz("Asia/Bangkok").format("YYYY-MM-DDTHH:mm");

      // Flex Message for selecting date and time
      const flexMessage = {
        type: "flex",
        altText: "เลือกวันที่และเวลา",
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "เลือกวันที่และเวลา",
                weight: "bold",
                size: "lg",
                color: "#1DB446", // สีเขียว
              },
              {
                type: "box",
                layout: "vertical",
                margin: "lg",
                spacing: "sm",
                contents: [
                  {
                    type: "button",
                    action: {
                      type: "datetimepicker",
                      label: "เลือกวันที่",
                      data: "action=selectDate",
                      mode: "date",
                      min: now.split("T")[0], // กำหนดวันที่ขั้นต่ำเป็นวันนี้
                    },
                    style: "primary", // ปุ่มสีหลัก
                    color: "#007BFF", // สีฟ้า
                  },
                  {
                    type: "button",
                    action: {
                      type: "datetimepicker",
                      label: "เลือกเวลาเริ่มต้น",
                      data: "action=startTime",
                      mode: "time",
                      min: now.split("T")[1], // กำหนดเวลาขั้นต่ำเป็นเวลาปัจจุบัน
                    },
                    style: "primary", // ปุ่มสีหลัก
                    color: "#FF5733", // สีส้ม
                  },
                  {
                    type: "button",
                    action: {
                      type: "datetimepicker",
                      label: "เลือกเวลาสิ้นสุด",
                      data: "action=endTime",
                      mode: "time",
                      min: now.split("T")[1], // กำหนดเวลาขั้นต่ำเป็นเวลาปัจจุบัน
                    },
                    style: "primary", // ปุ่มสีหลัก
                    color: "#28A745", // สีเขียว
                  },
                ],
              },
            ],
          },
          styles: {
            body: {
              backgroundColor: "#F8F9FA", // สีพื้นหลังของ Flex Message
            },
          },
        },
      };

      return client.replyMessage(event.replyToken, flexMessage);
    }

    if (userMessage === "แก้ไขการจอง") {
      session[userId] = { mode: "edit" }; // ตั้งค่าโหมดเป็นแก้ไขการจอง
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "กรุณาระบุรหัสการจองที่ต้องการแก้ไข",
      });
    }

    if (session[userId] && session[userId].mode === "edit" && !session[userId].bookingId) {
      const bookingId = userMessage;

      // ค้นหาข้อมูลการจองใน MongoDB
      const booking = await bookingsCollection.findOne({ bookingId });

      if (!booking) {
        return client.replyMessage(event.replyToken, {
          type: "text",
          text: "ไม่พบข้อมูลการจอง กรุณาตรวจสอบรหัสการจองอีกครั้ง",
        });
      }

      // บันทึกข้อมูลการจองใน session
      session[userId] = {
        ...booking,
        mode: "edit",
        bookingId: bookingId,
        currentQuestionIndex: 0, // เริ่มต้นคำถามแรก
      };

      return askNextEditQuestion(userId, event.replyToken);
    }

    if (session[userId] && session[userId].mode === "edit") {
      const userSession = session[userId];
      const currentQuestionIndex = userSession.currentQuestionIndex - 1;

      if (currentQuestionIndex >= 0 && currentQuestionIndex < editQuestions.length) {
        const question = editQuestions[currentQuestionIndex];
        userSession[question.key] = userMessage; // บันทึกคำตอบของผู้ใช้ลงใน session
      }

      return askNextEditQuestion(userId, event.replyToken);
    }

    if (session[userId] && session[userId].mode === "addRoom") {
      const userSession = session[userId];
      const roomQuestions = ["name", "location", "capacity", "imageUrl", "price"];
      const currentQuestionIndex = userSession.currentQuestionIndex - 1;

      if (currentQuestionIndex >= 0 && currentQuestionIndex < roomQuestions.length) {
        const key = roomQuestions[currentQuestionIndex];
        userSession[key] = userMessage; // บันทึกคำตอบของผู้ใช้
      }

      return askNextRoomQuestion(userId, event.replyToken);
    }

    if (userMessage === "วิธีการจอง") {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: `🌿 วิธีจองห้องประชุมกับ RUMA ง่ายนิดเดียว 💼☕️

เริ่มเลย!
กดปุ่ม "ค้นหาห้องว่าง & จองห้องประชุม"
เพื่อเริ่มภารกิจหาห้องประชุมสุดปังของคุณ 💫

เลือกวันและเวลา
บอทจะถามคุณว่าอยากประชุมวันไหน ⏰
เริ่มกี่โมง? และจบตอนไหน? (ตอบให้ตรงใจเลย!)

ดูห้องว่างกันเถอะ!
RUMA จะโชว์ห้องที่ว่างตรงกับเวลาคุณ
เลือกห้องที่ถูกใจได้เลย ไม่ต้องจองใจใคร 😘

กรอกข้อมูลเบา ๆ 📋

หัวข้อการประชุม
ชื่อผู้จอง (ใส่ชื่อให้ RUMA รู้จักคุณหน่อยน้า)
เบอร์โทรไว้เผื่อ RUMA โทรหา
จำนวนเพื่อน ๆ ที่จะมาประชุม
อุปกรณ์ที่อยากใช้ (โปรเจคเตอร์? ไวท์บอร์ด?)
อีเมลของคุณสำหรับยืนยันจอง
สรุปให้ก่อนยืนยัน 💌
RUMA จะส่งข้อความสรุปการจองมาให้คุณ
ถ้าทุกอย่างเรียบร้อยแล้ว กด “ยืนยันการจอง” ได้เลย!`,
      });
    }
  } else if (event.type === "postback") {
    const data = event.postback.data;

    if (data.startsWith("action=selectDate")) {
      const selectedDate = event.postback.params.date;

      if (!session[event.source.userId]) {
        session[event.source.userId] = {};
      }
      if (!session[event.source.userId].mode) {
        session[event.source.userId].mode = "new";
      }

      session[event.source.userId].date = selectedDate;

      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "กรุณาเลือกเวลาเริ่มต้น",
        quickReply: {
          items: [
            {
              type: "action",
              action: {
                type: "datetimepicker",
                label: "เลือกเวลาเริ่มต้น",
                data: "action=startTime",
                mode: "time",
              },
            },
          ],
        },
      });
    } else if (data.startsWith("action=startTime")) {
      const startTime = event.postback.params.time;

      if (!session[event.source.userId]) {
        session[event.source.userId] = {};
      }
      if (!session[event.source.userId].mode) {
        session[event.source.userId].mode = "new";
      }

      session[event.source.userId].startTime = startTime;

      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "กรุณาเลือกเวลาสิ้นสุด",
        quickReply: {
          items: [
            {
              type: "action",
              action: {
                type: "datetimepicker",
                label: "เลือกเวลาสิ้นสุด",
                data: "action=endTime",
                mode: "time",
              },
            },
          ],
        },
      });
    } else if (data.startsWith("action=endTime")) {
      const endTime = event.postback.params.time;

      if (!session[event.source.userId]) {
        session[event.source.userId] = {};
      }
      if (!session[event.source.userId].mode) {
        session[event.source.userId].mode = "new";
      }

      // อัปเดตเวลาสิ้นสุดใน session
      session[event.source.userId].endTime = endTime;

      // ดึงข้อมูลจาก session
      const selectedDate = session[event.source.userId]?.date;
      const startTime = session[event.source.userId]?.startTime;
      const endTimeSession = session[event.source.userId]?.endTime;

      if (!selectedDate || !startTime || !endTimeSession) {
        return client.replyMessage(event.replyToken, {
          type: "text",
          text: "ข้อมูลวันที่หรือเวลาไม่ครบถ้วน กรุณาลองใหม่อีกครั้ง",
        });
      }

      // ดึงการจองทั้งหมดที่ทับซ้อนกับช่วงเวลาที่เลือก
      const conflictingBookings = await bookingsCollection.find({
        date: selectedDate,
        $or: [
          {
            $and: [
              { startTime: { $lt: endTimeSession } }, // การจองที่เริ่มก่อนเวลาสิ้นสุด
              { endTime: { $gt: startTime } },       // การจองที่สิ้นสุดหลังเวลาเริ่มต้น
            ],
          },
        ],
      }).toArray();

      console.log("Conflicting Bookings:", conflictingBookings);

      const bookedRooms = conflictingBookings.map((booking) => booking.room);
      console.log("Booked Rooms:", bookedRooms);

      const allRooms = await roomsCollection.find({}).toArray();
      console.log("All Rooms:", allRooms);

      const availableRooms = allRooms.filter((room) => {
        return (
          !bookedRooms.includes(room.name) &&
          room.name &&
          room.location &&
          room.capacity
        );
      });
      console.log("Available Rooms:", availableRooms);

      if (availableRooms.length === 0) {
        return client.replyMessage(event.replyToken, {
          type: "text",
          text: "ไม่มีห้องประชุมว่างในช่วงเวลาที่คุณเลือก กรุณาเลือกเวลาใหม่",
        });
      }

      const roomFlexMessage = {
        type: "flex",
        altText: "เลือกห้องประชุม",
        contents: {
          type: "carousel",
          contents: availableRooms.slice(0, 10).map((room) => ({
            type: "bubble",
            hero: {
              type: "image",
              url: room.imageUrl || "https://via.placeholder.com/1024x512.png?text=No+Image",
              size: "full",
              aspectRatio: "20:13",
              aspectMode: "cover",
            },
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "text",
                  text: room.name || "ไม่มีชื่อห้อง",
                  weight: "bold",
                  size: "lg",
                  wrap: true,
                },
                {
                  type: "text",
                  text: `สถานที่: ${room.location || "ไม่มีข้อมูล"}`,
                  size: "sm",
                  color: "#666666",
                  wrap: true,
                },
                {
                  type: "text",
                  text: `ความจุ: ${room.capacity || "ไม่ระบุ"} คน`,
                  size: "sm",
                  color: "#666666",
                  wrap: true,
                },
              ],
            },
            footer: {
              type: "box",
              layout: "vertical",
              spacing: "sm",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  color: "#007BFF",
                  action: {
                    type: "postback",
                    label: "จองห้องประชุมนี้",
                    data: `action=bookRoom&roomId=${room._id}`,
                  },
                },
              ],
            },
          })),
        },
      };

      try {
        return client.replyMessage(event.replyToken, roomFlexMessage);
      } catch (error) {
        console.error("Error sending Flex Message:", error);
      }
    } else if (data.startsWith("action=bookRoom")) {
      const roomId = data.split("&")[1].split("=")[1];
      console.log("roomId:", roomId);

      let room;
      try {
        room = await roomsCollection.findOne({ _id: new ObjectId(roomId) });
      } catch (error) {
        console.error("Error finding room:", error);
        return client.replyMessage(replyToken, {
          type: "text",
          text: "เกิดข้อผิดพลาดในการค้นหาห้องประชุม กรุณาลองใหม่อีกครั้ง",
        });
      }

      if (!room) {
        return client.replyMessage(replyToken, {
          type: "text",
          text: "ไม่พบข้อมูลห้องประชุม กรุณาลองใหม่อีกครั้ง",
        });
      }

      if (!session[event.source.userId]) {
        session[event.source.userId] = {};
      }

      const userSession = session[event.source.userId];
      userSession.mode = "new";
      userSession.room = room.name;

      // ถ้ามีค่าจากก่อนหน้าแล้ว ให้ใช้ค่าที่มี ไม่กำหนดใหม่
      userSession.date =
        userSession.date || moment().tz("Asia/Bangkok").format("YYYY-MM-DD");
      userSession.startTime = userSession.startTime || "12:00";
      userSession.endTime = userSession.endTime || "14:00";

      userSession.currentQuestionIndex = 0;

      return askNextQuestion(event.source.userId, event.replyToken);
    } else if (data.startsWith("action=confirmBooking")) {
      const bookingId = data.split("&")[1].split("=")[1];
      console.log("Confirming booking with ID:", bookingId);

      // ดึงข้อมูลการจองจาก session
      const userSession = Object.values(session).find(
        (s) => s.bookingId === bookingId
      );

      if (!userSession) {
        return client.replyMessage(event.replyToken, {
          type: "text",
          text: "ไม่พบข้อมูลการจอง กรุณาลองใหม่อีกครั้ง",
        });
      }

      // บันทึกข้อมูลการจองลง MongoDB
      try {
        await saveBookingToMongoDB(userSession);

        // ส่งข้อความยืนยันการจองสำเร็จ
        return client.replyMessage(event.replyToken, {
          type: "flex",
          altText: "การจองสำเร็จ",
          contents: {
            type: "bubble",
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "text",
                  text: "✅ การจองสำเร็จ!",
                  weight: "bold",
                  size: "lg",
                  color: "#1DB446",
                },
                {
                  type: "text",
                  text: `รหัสการจอง: ${bookingId}`,
                  size: "sm",
                  color: "#666666",
                  wrap: true,
                },
              ],
            },
          },
        });
      } catch (error) {
        console.error("Error saving booking to MongoDB:", error);
        return client.replyMessage(event.replyToken, {
          type: "text",
          text: "เกิดข้อผิดพลาดในการบันทึกข้อมูลการจอง กรุณาลองใหม่อีกครั้ง",
        });
      }
    } else if (data.startsWith("action=confirmCancel")) {
      const bookingId = data.split("&")[1].split("=")[1];

      const success = await cancelBooking(bookingId);

      if (success) {
        return client.replyMessage(event.replyToken, {
          type: "text",
          text: "✅ ยกเลิกการจองสำเร็จ",
        });
      } else {
        return client.replyMessage(event.replyToken, {
          type: "text",
          text: "❌ ไม่พบการจองสำหรับรหัสนี้ กรุณาตรวจสอบรหัสการจองอีกครั้ง",
        });
      }
    } else if (data.startsWith("action=selectBookingDate")) {
      const selectedDate = event.postback.params.date;
      return showBookingsForDate(selectedDate, event.replyToken);
    } else if (data === "action=viewBookings") {
      return showDatePickerForBookings(event.replyToken);
    } else if (data === "action=addRoom") {
      session[event.source.userId] = { mode: "addRoom", currentQuestionIndex: 0 };
      return askNextRoomQuestion(event.source.userId, event.replyToken);
    } else if (data === "action=deleteRoom") {
      return showRoomsForDeletion(event.replyToken);
    } else if (data.startsWith("action=deleteRoom&roomId")) {
      const roomId = data.split("&")[1].split("=")[1];
      return deleteRoom(roomId, event.replyToken);
    } else if (data === "action=addAdmin") {
      // เริ่มต้นโหมดเพิ่มแอดมิน
      session[event.source.userId] = { mode: "addAdmin", currentQuestionIndex: 0 };
      return askNextAdminQuestion(event.source.userId, event.replyToken);
    } else if (session[event.source.userId] && session[event.source.userId].mode === "addAdmin") {
      // ดำเนินการถามคำถามถัดไป
      const userSession = session[event.source.userId];
      const adminQuestions = ["username", "password", "email"];
      const currentQuestionIndex = userSession.currentQuestionIndex - 1;

      if (currentQuestionIndex >= 0 && currentQuestionIndex < adminQuestions.length) {
        const key = adminQuestions[currentQuestionIndex];
        userSession[key] = event.message.text; // บันทึกคำตอบของผู้ใช้
      }

      return askNextAdminQuestion(event.source.userId, event.replyToken);
    }
  }
};

// Function to show date picker for bookings
const showDatePickerForBookings = (replyToken) => {
  const now = moment().tz("Asia/Bangkok").format("YYYY-MM-DD");

  const datePickerFlexMessage = {
    type: "flex",
    altText: "เลือกวันที่",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "📅 เลือกวันที่",
            weight: "bold",
            size: "lg",
            color: "#1DB446",
          },
          {
            type: "button",
            style: "primary",
            color: "#007BFF",
            action: {
              type: "datetimepicker",
              label: "เลือกวันที่",
              data: "action=selectBookingDate",
              mode: "date",
              min: now, // วันที่ขั้นต่ำเป็นวันนี้
            },
          },
        ],
      },
    },
  };

  return client.replyMessage(replyToken, datePickerFlexMessage);
};

// Function to show bookings for a selected date
const showBookingsForDate = async (selectedDate, replyToken) => {
  try {
    const bookings = await bookingsCollection.find({ date: selectedDate }).toArray();

    if (bookings.length === 0) {
      return client.replyMessage(replyToken, {
        type: "text",
        text: `ไม่พบรายการจองสำหรับวันที่ ${selectedDate}`,
      });
    }

    const bookingsFlexMessage = {
      type: "flex",
      altText: `รายการจองวันที่ ${selectedDate}`,
      contents: {
        type: "carousel",
        contents: bookings.map((booking) => ({
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: "📋 รายละเอียดการจอง",
                weight: "bold",
                size: "lg",
                color: "#1DB446",
              },
              {
                type: "text",
                text: `🔑 รหัสการจอง: ${booking.bookingId}`,
                size: "sm",
                color: "#666666",
                wrap: true,
              },
              {
                type: "text",
                text: `🏢 ห้อง: ${booking.room}`,
                size: "sm",
                color: "#666666",
                wrap: true,
              },
              {
                type: "text",
                text: `📅 วันที่: ${booking.date}`,
                size: "sm",
                color: "#666666",
                wrap: true,
              },
              {
                type: "text",
                text: `🕒 เวลา: ${booking.startTime} - ${booking.endTime}`,
                size: "sm",
                color: "#666666",
                wrap: true,
              },
              {
                type: "text",
                text: `📋 หัวข้อ: ${booking.meetingTopic}`,
                size: "sm",
                color: "#666666",
                wrap: true,
              },
              {
                type: "text",
                text: `👤 ผู้จอง: ${booking.reserverName}`,
                size: "sm",
                color: "#666666",
                wrap: true,
              },
            ],
          },
        })),
      },
    };

    return client.replyMessage(replyToken, bookingsFlexMessage);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return client.replyMessage(replyToken, {
      type: "text",
      text: "เกิดข้อผิดพลาดในการดึงข้อมูลรายการจอง กรุณาลองใหม่อีกครั้ง",
    });
  }
};

// Function to show rooms for deletion
const showRoomsForDeletion = async (replyToken) => {
  try {
    const rooms = await roomsCollection.find({}).toArray();

    if (rooms.length === 0) {
      return client.replyMessage(replyToken, {
        type: "text",
        text: "ไม่พบห้องประชุมในระบบ",
      });
    }

    const roomsFlexMessage = {
      type: "flex",
      altText: "ลบห้องประชุม",
      contents: {
        type: "carousel",
        contents: rooms.map((room) => ({
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "text",
                text: room.name || "ไม่มีชื่อห้อง",
                weight: "bold",
                size: "lg",
                wrap: true,
              },
              {
                type: "text",
                text: `สถานที่: ${room.location || "ไม่มีข้อมูล"}`,
                size: "sm",
                color: "#666666",
                wrap: true,
              },
              {
                type: "text",
                text: `ความจุ: ${room.capacity || "ไม่ระบุ"} คน`,
                size: "sm",
                color: "#666666",
                wrap: true,
              },
            ],
          },
          footer: {
            type: "box",
            layout: "vertical",
            spacing: "sm",
            contents: [
              {
                type: "button",
                style: "primary",
                color: "#FF0000",
                action: {
                  type: "postback",
                  label: "ลบห้องประชุมนี้",
                  data: `action=deleteRoom&roomId=${room._id}`,
                },
              },
            ],
          },
        })),
      },
    };

    return client.replyMessage(replyToken, roomsFlexMessage);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return client.replyMessage(replyToken, {
      type: "text",
      text: "เกิดข้อผิดพลาดในการดึงข้อมูลห้องประชุม กรุณาลองใหม่อีกครั้ง",
    });
  }
};

const deleteRoom = async (roomId, replyToken) => {
  try {
    const result = await roomsCollection.deleteOne({ _id: new ObjectId(roomId) });

    if (result.deletedCount > 0) {
      return client.replyMessage(replyToken, {
        type: "text",
        text: "✅ ลบห้องประชุมสำเร็จ",
      });
    } else {
      return client.replyMessage(replyToken, {
        type: "text",
        text: "❌ ไม่พบห้องประชุมที่ต้องการลบ",
      });
    }
  } catch (error) {
    console.error("Error deleting room:", error);
    return client.replyMessage(replyToken, {
      type: "text",
      text: "❌ เกิดข้อผิดพลาดในการลบห้องประชุม กรุณาลองใหม่อีกครั้ง",
    });
  }
};

// Start the server
app.listen(process.env.PORT || 3000, () => {
  console.log("Server running on port " + (process.env.PORT || 3000));
});

app.post("/webhook", line.middleware(lineConfig), (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});
