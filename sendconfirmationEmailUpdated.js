const { Firestore } = require('@google-cloud/firestore');
const nodemailer = require('nodemailer');

const firestore = new Firestore();

// Convert slot to readable IST string for email
function convertSlotToDateTimeString(slot) {
  if (typeof slot === 'string') {
    const slotWithOffset = slot.includes('+') ? slot : `${slot}+05:30`;
    return new Date(slotWithOffset).toLocaleString('en-IN', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
  }

  if (typeof slot === 'object' && slot.year && slot.month && slot.day) {
    const date = new Date(
      slot.year,
      slot.month - 1,
      slot.day,
      slot.hours || 0,
      slot.minutes || 0,
      slot.seconds || 0
    );
    return date.toLocaleString('en-IN', {
      dateStyle: 'full',
      timeStyle: 'short',
    });
  }

  return '[Invalid time]';
}

// Convert slot to UTC Date object for Firestore
function convertSlotToUTC(slot) {
  if (typeof slot === 'object' && slot.year && slot.month && slot.day) {
    const localDate = new Date(
      slot.year,
      slot.month - 1,
      slot.day,
      slot.hours || 0,
      slot.minutes || 0,
      slot.seconds || 0
    );
    return new Date(localDate.getTime() - (5.5 * 60 * 60 * 1000));
  }

  if (typeof slot === 'string') {
    const istDate = new Date(`${slot}+05:30`);
    return new Date(istDate.getTime() - (5.5 * 60 * 60 * 1000));
  }

  return null;
}

exports.sendAppointmentEmail = async (req, res) => {
  const doctor = req.body?.sessionInfo?.parameters?.doctor;
  const slot = req.body?.sessionInfo?.parameters?.slot;

  if (!doctor || !slot) {
    res.status(400).send('Missing doctor or slot information');
    return;
  }

  const slotTime = convertSlotToDateTimeString(slot); // For email (IST)
  const appointmentDateUTC = convertSlotToUTC(slot); // For Firestore (UTC)

  if (!appointmentDateUTC) {
    res.status(400).send('Invalid slot format');
    return;
  }

  const reminderDateUTC = new Date(appointmentDateUTC.getTime() - 60 * 60 * 1000); // 1 hour before

  // Save to Firestore
  await firestore.collection('appointments').add({
    doctor,
    appointmentTimeUTC: appointmentDateUTC.toISOString(),
    reminderTimeUTC: reminderDateUTC.toISOString(),
    createdAt: new Date().toISOString(),
    reminderSent: false,
  });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'tarunyadav.3050@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const mailOptions = {
    from: 'tarunyadav.3050@gmail.com',
    to: 'yadav.tarun21@gmail.com',
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
// Note: Ensure you have the necessary environment variables set for nodemailer to work.
// Also, make sure to handle errors and edge cases as needed in your application.
// This code is designed to send a confirmation email for a doctor's appointment
// in Edit and deploy env variable have 16 digits key