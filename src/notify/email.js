import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
  host: 'smtp.163.com',
  port: 465,
  secure: true,
  auth: {
    user: '15001374711@163.com',
    pass: 'CHpMHxCvmuuRjeVV',
  },
});

const sendMail = async (content) => {
  return await transporter.sendMail({
    from: '15001374711@163.com',
    to: '15001374711@163.com',
    subject: '可转债买卖提醒',
    text: content,
  });
};
export default sendMail;
