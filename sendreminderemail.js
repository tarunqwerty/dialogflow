const { Firestore } = require('@google-cloud/firestore');
const nodemailer = require('nodemailer');

const firestore = new Firestore();

// Helper to convert Dialogflow slot to JS Date object
function parseSlotToDate(slot) {
  if (typeof slot === 'object' && slot.year && slot.month && slot.day) {
    return new Date(
      Date.UTC(
        slot.year,
        slot.month - 1,
        slot.day,
        slot.hours || 0,
        slot.minutes || 0,
        slot.seconds || 0
      )
    );
  }

  if (typeof slot === 'string') {
    return new Date(slot.includes('+') ? slot : `${slot}+05:30`);
  }

  return null;
}

// Convert slot to readable string for email
function convertSlotToDateTimeString(slot) {
  const date = parseSlotToDate(slot);
  return date
    ? date.toLocaleString('en-IN', {
        dateStyle: 'full',
        timeStyle: 'short',
        timeZone: 'Asia/Kolkata',
      })
    : '[Invalid time]';
}

exports.sendAppointmentEmail = async (req, res) => {
  const doctor = req.body?.sessionInfo?.parameters?.doctor;
  const slot = req.body?.sessionInfo?.parameters?.slot;

  if (!doctor || !slot) {
    res.status(400).send('Missing doctor or slot information');
    return;
  }

  const appointmentDate = parseSlotToDate(slot);
  if (!appointmentDate) {
    res.status(400).send('Invalid slot format');
    return;
  }

  const slotTime = convertSlotToDateTimeString(slot);

  // Calculate reminder time (1 hour before appointment)
  const reminderDate = new Date(appointmentDate.getTime() - 60 * 60 * 1000);

  // Save appointment and reminder to Firestore
  const appointmentRef = firestore.collection('appointments').doc();
  await appointmentRef.set({
    doctor,
    appointmentTimeUTC: appointmentDate.toISOString(),
    reminderTimeUTC: reminderDate.toISOString(),
    createdAt: new Date().toISOString(),
  });

  // Send confirmation email
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'tarunyadav.3050@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const mailOptions = {
    from: 'tarunyadav.3050@gmail.com',
    to: 'yadav.tarun21@gmail.com', // hardcoded email
    subject: 'Doctor Appointment Confirmation',
    text: `Your appointment with ${doctor} is confirmed for ${slotTime}.`,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).send({
      fulfillment_response: {
        messages: [{ text: { text: ['Email sent successfully.'] } }],
      },
    });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).send({
      fulfillment_response: {
        messages: [{ text: { text: ['Failed to send email.'] } }],
      },
    });
  }
};
