require("../settings");
const express = require('express');
const router = express.Router();
const passport = require('passport'),
   jwt = require('jsonwebtoken');

const {
   createActivationToken,
   getHashedPassword,
   randomText
} = require('../lib/functions');
const {
   checkEmail,
   checkUsername,
   addUser
} = require('../MongoDB/function');
const {
   notAuthenticated
} = require('../lib/auth');
const sendEmail = require('../lib/email');

router.get('/login', notAuthenticated, (req, res) => {
   res.render('login', {
      layout: 'login'
   });
});

router.post('/login', async (req, res, next) => {
   passport.authenticate('local', {
      successRedirect: '/docs',
      failureRedirect: '/users/login',
      failureFlash: `<div class="alert alert-danger">
                  <button type="button" aria-hidden="true" class="close" data-dismiss="alert" aria-label="Close">
                    <i class="tim-icons icon-simple-remove"></i>
                  </button>
                  <span><b>Nama pengguna atau kata sandi tidak ditemukan</span>
                </div>`,
   })(req, res, next);
});
//Verifikasi email
router.get('/activation/', async (req, res) => {
   let id = req.query.id;
   if (!id) {
      req.flash('error_msg', "Invalid activation token")
      res.redirect("/users/register");
   }

   await jwt.verify(id, ACTIVATION_TOKEN_SECRET, async (err, user) => {
      if (err) {
         req.flash('error_msg', "Invalid activation token")
         res.redirect("/users/register");
      } else {
         const {
            apikey,
            username,
            email,
            password
         } = user
         let checking = await checkUsername(username);
         let checkingEmail = await checkEmail(email);
         if (checking) {
            req.flash('error_msg', "Maaf. Pengguna dengan nama pengguna tersebut sudah ada. Silakan gunakan nama pengguna lain!")
            res.redirect("/users/signup");
         } else if (checkingEmail) {
            req.flash('error_msg', "Maaf. Pengguna dengan alamat email tersebut sudah ada. Silakan gunakan email lain!")
            res.redirect("/users/signup");
         } else {
            addUser(username, email, password, apikey);
            req.flash('success_msg', "Pendaftaran berhasil. Silakan login untuk menggunakan layanan kami.")
            res.redirect("/users/login");
         }
      }
   });
});
router.get('/signup', notAuthenticated, (req, res) => {
   res.render('signup', {
      layout: 'signup'
   });
});

router.post('/signup', async (req, res) => {
   try {
      let {
         email,
         username,
         pass,
         pass2
      } = req.body;
      if (pass.length < 6 || pass2 < 6) {
         req.flash('error_msg', 'Kata sandi harus mengandung minimal 6 karakter');
         return res.redirect('/users/signup');
      }
      if (pass === pass2) {
         let checking = await checkUsername(username);
         let checkingEmail = await checkEmail(email);
         if (checkingEmail) {
            req.flash('error_msg', 'Pengguna dengan Email yang sama sudah ada');
            return res.redirect('/users/signup');
         }
         if (checking) {
            req.flash('error_msg', 'Nama Pengguna sudah digunakan !');
            return res.redirect('/users/signup');
         } else {
            let hashedPassword = getHashedPassword(pass);
            let apikey = randomText(10);
            const newUser = {
               apikey,
               username: username,
               email,
               password: hashedPassword
            }
            const activationToken = createActivationToken(newUser)
            const url = `https://${req.hostname}/users/activation?id=${activationToken}`
            await sendEmail.inboxGmailRegist(email, url);
            req.flash('success_msg', 'Anda sekarang sudah terdaftar, silakan periksa email Anda untuk memverifikasi akun Anda');
            return res.redirect('/users/login');
         }
      } else {
         req.flash('error_msg', 'Konfirmasi Kata Sandi dan Kata Sandi tidak sama');
         return res.redirect('/users/signup');
      }
   } catch (err) {
      console.log(err);
   }
})

router.get('/logout', (req, res) => {
   req.logout();
   req.flash('success_msg', 'logout success');
   res.redirect('/users/login');
});

module.exports = router;
