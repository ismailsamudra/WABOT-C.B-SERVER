const { Client , MessageMedia ,LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const cors = require('cors')
const { body, validationResult } = require('express-validator');
const http = require('http');
const fs = require('fs');
const { phoneNumberFormatter } = require('./formatter');
const fileUpload = require('express-fileupload');
const axios = require('axios');
const port = process.env.PORT || 3001;
const app = express();
const bodyParser = require('body-parser');
const server = http.createServer(app);
const jsonParser = bodyParser.json()
const qrcode = require('qrcode-terminal');
// var cron = require('node-cron');
const jwt = require('jsonwebtoken');

process.env.TZ = "Asia/Makassar";
const tgl = require('date-and-time');
let now = new Date();
 /* date("%Y-%m-%d %H:%M:%S")*/

/**==============================================================
 * JSON DB START
 ===============================================================*/
const CONSUMER = './cons.json';
cons = (fs.existsSync(CONSUMER))?require(CONSUMER):'';
let consId = cons.id;
let consSecret = cons.secret;
let consUrl = cons.url;
let uri_reply = cons.uri_reply;
let uri_cronjob = cons.uri_cronjob;
let origin=0;
let xId=0;
let xTime=0;
let xSignature=0;
let xAuth=0;
/**==============================================================
 * JSON DB END
===============================================================*/
/**==============================================================
 * CORS INIT START
===============================================================*/
let corsOptionsDelegate = function (req, callback) {
  origin = (req.header('Origin'))?req.header('Origin'):0;
  xId = (req.header('X-cons-id'))?req.header('X-cons-id'):0;
  xTime = (req.header('X-Timestamp'))?req.header('X-Timestamp'):0;
  xSignature = (req.header('X-Signature'))?req.header('X-Signature'):0;
  xAuth = (req.header('X-Authorization'))?req.header('X-Authorization'):0;
  callback(null,true);
}
/**==============================================================
 * CORS INIT END
===============================================================*/
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(fileUpload({
  debug: false
}));
// app.use(cors());
app.use(cors(corsOptionsDelegate));

const checkRegisteredNumber = async function(number) {
  const isRegistered = await client.isRegisteredUser(number);
  return isRegistered;
}
//---------------------------------------------
const client = new Client({
    authStrategy: new LocalAuth(),
    restartOnAuthFail: true,
    puppeteer: { 
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process', // <- this one doesn't works in Windows
        '--disable-gpu'
      ]
     }
  });
//---------------------------------------------
/**==============================================================
 * CLIENT WHATSAPP START
 ===============================================================*/
 client.initialize();
 let status = "NOT READY";
 let qrcode_return = null;
  //---------------------------------------------
  client.on('qr', (qr) => {
    qrcode_return = qr;
    // qrcode.generate(qr, {small: true});
  });
  //---------------------------------------------
  //---------------------------------------------
  client.on('authenticated', () => {
    console.log('WhatsApp Web On : AUTHENTICATED');
  });
  //---------------------------------------------
  //---------------------------------------------
  client.on('auth_failure', msg => {
    console.error('AUTHENTICATION FAILURE', msg);
    client.initialize();
    status = "NOT READY";
    console.log('WhatsApp Web On : '+status);
  });
  //---------------------------------------------
  //---------------------------------------------
  client.on('ready', () => {
    status = "READY";
    console.log('WhatsApp Web On : '+status);
  });
  //---------------------------------------------
  //---------------------------------------------
  client.on('change_state', state => {
    console.log('WhatsApp Web On : CHANGE STATE', state );
  });
  //---------------------------------------------
  //---------------------------------------------
  client.on('disconnected', (reason) => {
    console.log('Client was logged out', reason);
    client.initialize();
    console.log('WhatsApp Web On : '+status);
  });
  //---------------------------------------------
//---------------------------------------------
client.on('message', message  => {
  let msg = message.body;
  axios
  .post(consUrl+uri_reply, {msg},{
    headers:{
      "X-Token": base64_encode(consId)
    }})
  .then( async res => {

      if(res.data.msg!=''){
        if(res.data.file=='' || res.data.file==null){
          if(res.data.msg!=null){
            message.reply(res.data.msg);
          }
        }else{
            let modul = res.data.modul;
            let caption = res.data.msg;
            let file = res.data.file;
            let mimetype;
            const attachment = await axios.get(consUrl+modul+'/'+file, {
              responseType: 'arraybuffer'
            }).then(response => {
              mimetype = response.headers['content-type'];
              return response.data.toString('base64');
            });
            const media = new MessageMedia(mimetype, attachment, 'Media');
            client.sendMessage(message.from, media, {
              caption: caption
            });
        }
      }

  });
});
//---------------------------------------------
/**==============================================================
 * CLIENT WHATSAPP END
 ===============================================================*/
//  app.get("/getChat", async (req, res) => {
//   let chats = await client.getChats();
//   //console.log(chats);
//   let final = [];
//   for (const chat of chats) {
//       let pesan = await chat.fetchMessages({limit : 50});
//       let response = JSON.stringify(pesan);
//       let r = JSON.parse(response);
//       final.push(r);
//   }
//   res.status(200).json({
//     status: true,
//     response: final
//   });
// });
//---------------------------------------------
// app.get("/", (req, res) => {
//       res.status(200).json({
//         code: 200,
//         msg: tgl.format(tgl.addMinutes(now, 1 ,true),'YYYYMMDDHHmmss')
//       });
  
//   });
//---------------------------------------------
//---------------------------------------------
app.get("/qr", (req, res) => {
    var code = Consumer();
    if(code==200){

      res.status(200).json({
        code: 200,
        msg: "OK",
        qr: qrcode_return
      });
  
    }else{
      res.status(code).json({
        code,
        msg: getRes(code),
        qr:''
      });
    }
  });
//---------------------------------------------
//---------------------------------------------
app.get("/cek_number/:number", async(req, res) => {
  var code = Consumer();
  if(code==200){
    var number = req.params.number;
      if(!number){
        res.status(200).json({
          code: 200,
          msg: 'NO.HP ERROR'
        });
        return;
      }
        if(status=="READY"){
          const hp = phoneNumberFormatter(number);
          const isRegisteredNumber = await checkRegisteredNumber(hp);
          if(!isRegisteredNumber){
            res.status(200).json({
              code: 200,
              msg: 'NO.HP BELUM TERDAFTAR WhatsApp'
            });
          } else{
            res.status(200).json({
              code: 200,
              msg: "OK"
            });
          }
        }else{
          res.status(200).json({
            code: 200,
            msg: 'SERVER NOT READY'
          });
        }
    }else{
      res.status(code).json({
        code,
        msg: getRes(code),
        qr:''
      });
    }
});
//---------------------------------------------
//---------------------------------------------
  app.get("/status", (req, res) => {
    var code = Consumer();
    if(code==200){
      if(status=="READY"){
        inc = (client.info)?client.info:false;
        if(inc){
          nomor = inc.wid.user;
          res.status(200).json({
              code: 200,
              msg: status,
              name:inc.pushname,
              number: nomor.replace('62','0')
          });
        }else{
          res.status(200).json({
              code: 200,
              msg: status,
              name:'Private',
              number: 'Hidden'
          });
        }
      }else{
        res.status(200).json({
            code: 200,
            msg: status,
            name:'',
            number: ''
        });

      }
  
    }else{
      res.status(code).json({
        code,
        msg: getRes(code),
        name:'',
        number: ''
      });
    }
  });
//---------------------------------------------
//---------------------------------------------
  app.get("/logout", async(req, res) => {
    var code = Consumer();
    if(code==200){

      status="NOT READY";
      await client.logout().then(()=>{
        client.initialize();
      });
      res.status(200).json({
         code: 200,
         msg:"Berhasil Keluar"
       });
       console.log('WhatsApp Web On : LOGOUT');
  
    }else{
      res.status(code).json({
        code,
        msg: getRes(code)
      });
    }
  });
//---------------------------------------------
// Send SCREEN SHOOT START =========================================
app.post('/send-base64', jsonParser, async (req, res) => {
  var code = Consumer();
  if(code==200){
  const number = phoneNumberFormatter(req.body.number);
  const caption = req.body.caption;
  const base64 = req.body.base64;
  const mime = req.body.mime;
  a0 = cek_ready(res);
  if(a0){return a0;}
  //==== CEK NO WA
  const isRegisteredNumber = await checkRegisteredNumber(number);
  if(!isRegisteredNumber){dt = res_nomor(res);return dt;}  
  const media = new MessageMedia(mime, base64, 'Media');
  client.sendMessage(number, media, {
    caption: caption
  }).then(response => {
    res.status(200).json({
        code: 200,
        msg: "Berhasil Dikirim",
        data: ''
      });
    }).catch(err => {
     res.status(500).json({
        code: 500,
        msg: "Gagal terkirim",
        data: ''
      });
    });
}else{
  res.status(code).json({
    code,
    msg: getRes(code)
  });
  console.log('WhatsApp Web On : FAILED SENDING MESSAGE.');
}
});
// Send SCREEN SHOOT END ===========================================
// Send MEDIA START ================================================
app.post('/send-media', jsonParser, async (req, res) => {
  var code = Consumer();
  if(code==200){
  const number = phoneNumberFormatter(req.body.number);
  const caption = req.body.caption;
  const file = req.body.file;
  const modul = req.body.modul;
       //==== CEK READY
       a0 = cek_ready(res);
       if(a0){return a0;}
       //==== CEK NO WA
      //  const isRegisteredNumber = await checkRegisteredNumber(number);
      //  if(!isRegisteredNumber){dt = res_nomor(res);return dt;}  
       let mimetype;
       const attachment = await axios.get(consUrl+modul+'/'+file, {
         responseType: 'arraybuffer'
       }).then(response => {
         mimetype = response.headers['content-type'];
         return response.data.toString('base64');
       });
       const media = new MessageMedia(mimetype, attachment, 'Media');

       client.sendMessage(number, media, {
         caption: caption
       }).then(response => {
        res.status(200).json({
            code: 200,
            msg: "Berhasil Dikirim",
            data: ''
          });
        }).catch(err => {
         res.status(500).json({
            code: 500,
            msg: "Gagal terkirim",
            data: ''
          });
        });
  }else{
    res.status(code).json({
      code,
      msg: getRes(code),
      data: ''
    });
    console.log('WhatsApp Web On : FAILED SENDING MESSAGE.');
  }
});
// Send MEDIA END =================================================
// Send message ===================================================
app.post('/send', jsonParser, [
  body('number').notEmpty(),
  body('message').notEmpty()
], async (req, res) => {
  console.log('WhatsApp Web On : WAITING TO SENDING MESSAGE.');
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });
  var code = Consumer();
  if(code==200){
    const number = phoneNumberFormatter(req.body.number);
    const message = req.body.message;
    // console.log("TO : "+number);
    // console.log("MSG : "+message);
       //==== CEK READY
       a0 = cek_ready(res);
       if(a0){return a0;}
       //==== CEK ERROR
       if(!errors.isEmpty()){er = cek_error(res);return er;}
       //==== CEK NO WA
       const isRegisteredNumber = await checkRegisteredNumber(number);
       if(!isRegisteredNumber){dt = res_nomor(res);return dt;}  
       //==== KIRIM PESAN
       kirim(number, message,res);
       console.log('WhatsApp Web On : SUCCESS SENDING MESSAGE.');

  }else{
    res.status(code).json({
      code,
      msg: getRes(code)
    });
    console.log('WhatsApp Web On : FAILED SENDING MESSAGE.');
  }
});
// END LINE =====================================================

  /**==============================================================
   * CATATAN JWT START
   ===============================================================*/
  //  var consSecret = 'mazaya22';
  //  var consId = 'a2023';
  //  try {
  //    var data = jwt.verify('yuyueyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJhMjAyMyI6Imh0dHA6Ly9leGFtcGxlLm9yZyJ9.qGq_ArP521Y1gwglbmTXyFuNOJv8o78dJnW8rmd-BBU', consSecret);
  //    console.log(data.consId);
  //  } catch (error) {
  //    console.log('invalid token');
  //  }
    // ------------------------------------
    // var token = jwt.sign({ a2023: 'bar' }, privateKey);
    // console.log(token);
  /**==============================================================
   * CATATAN JWT END
   ===============================================================*/
  server.listen(port, function() {
    console.log('App running on Port : ' + port);
    // console.log('url : http://127.0.0.1:'+ port);
    console.log(consUrl+uri_reply);
  });

//###########################################_BASE64_PHP_START
function base64_decode(val){
    return atob(val);
}
function base64_encode(val){
    return btoa(val);
}
//#############################################_BASE64_PHP_END
//###########################################_JWT_CODE_START
function jwt_decode(val){
    try {
      return jwt.verify(val, consSecret);
    } catch (error) {
      return false;
    }
}
function jwt_encode(val){
    try {
      return jwt.sign(val, consSecret);
    } catch (error) {
      return false;
    }
}
function signature(){
    try {
      return jwt.sign({cons_id: consId,tstamp:tstamp(5)}, consSecret);
    } catch (error) {
      return false;
    }
}
function tstamp(m){
  return tgl.format(tgl.addMinutes(now, m ,true),'YYYYMMDDHHmmss');
}
//#############################################_JWT_CODE_END
//#############################################
function Consumer(){
  var data = jwt_decode(xSignature);
  if(data){
       if(data.cons_id==xId && xId==consId){
             if(date("%Y%m%d%H%M%S")<=data.tstamp){
                return 200;
             }else{
                return 408;
             }
       }else{
         return 501;
       }
  }else{
    return 503;
  }
}
//#############################################
//#############################################
function getRes(code){
  switch (code) {
    case 200: return "OK";break;
    case 500: return "INTERNAL_SERVER_ERROR";break;
    case 501: return "CONSUMER_ID_SALAH";break;
    case 503: return "INVALID_SIGNATURE";break;
    case 401: return "UNAUTHORIZED";break;
    case 408: return "REQUEST_TIMEOUT";break;
    case 424: return "FAILED_DEPENDENCY";break;
    case 412: return "PRECONDITION_FAILED";break;
    case 204: return "NO_CONTENT";break;
    default:return false;
  }
}
//#############################################
//#############################################
function cek_ready(res){
  if(status == "NOT READY"){
    dt = res.status(500).json({
        code: 500,
        msg: status
    });
    console.log('WhatsApp Web On : FAILED , WHATSAPP NOT READY');
    return dt;
  }
}
//#############################################
//#############################################
function cek_error(res){
  dt = res.status(422).json({
      code: 422,
      msg: 'WhatsApp Web On : ERROR'
    });
    console.log('WhatsApp Web On : FIELD , ERROR');
  return dt;
}
//#############################################
//#############################################
function res_nomor(res){
  dt = res.status(420).json({
    code: 420,
    msg: 'No.Hp Belum Terdaftar WhatsApp'
  });
  console.log('WhatsApp Web On : FAILED , The number is not registered');
  return dt;
}
//#############################################
//#############################################
function kirim(no,msg,res){
  client.sendMessage(no, msg).then(response => {
  res.status(200).json({
      code: 200,
      msg: "Berhasil Dikirim",
      data: ''
    });
  }).catch(err => {
   res.status(500).json({
      code: 500,
      msg: "Gagal terkirim",
      data: ''
    });
  });
}
//#############################################
//#############################################
function date(fstr) {
  let date = new Date();
  return fstr.replace (/%[YmdHMS]/g, function (m) {
    switch (m) {
    case '%Y': return date['getFullYear'] ();
    case '%m': m = 1 + date['getMonth'] (); break;
    case '%d': m = date['getDate'] (); break;
    case '%H': m = date['getHours'] (); break;
    case '%M': m = date['getMinutes'] (); break;
    case '%S': m = date['getSeconds'] (); break;
    default: return m.slice (1);
    }
    return ('0' + m).slice (-2);
  });
}
//#############################################