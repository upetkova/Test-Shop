const postgres = require('postgres');
const express = require('express');
const path = require('path');
const alert = require('alert');
const app = express();

const sql = postgres({
  host: 'localhost',            // Postgres ip address[s] or domain name[s]
  port: 5432,          // Postgres server port[s]
  database: 'dropshop',            // Name of database to connect to
  username: 'postgres',            // Username of database user
  password: 'UPQH'       // Password of database user
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/api/login', async (req, res) => {

  console.log(req.body.email);

  const users = await sql`
      SELECT user_id, email
      FROM public.users
      WHERE email = ${req.body.email.trim()} AND password = ${req.body.password.trim()}
  `;

  if (users.length === 0) {
    json = {

      errCode: 1,
      errMessage: 'No user with such email and password is found'
    }
  } else {

    var token = create_UUID();
    await sql`
        UPDATE user_tokens
        SET user_token = ${token}
        WHERE user_id = (SELECT user_id FROM users WHERE email = ${req.body.email})
      `;
    json = {
      errCode: 0,
      token: token,
    }
  }


    res.writeHead(200, { 'Content-Type': 'text/json' });
res.write(JSON.stringify(json));
res.end();
  });

app.delete('/api/logout', async (req, res) => {

  console.log(req.body.token);

  await sql`
      DELETE FROM user_tokens
      WHERE user_token = ${req.body.token}
  `;

  json = {
    errCode: 0,
    message: "Succesfull logout",
  }

  res.writeHead(200, { 'Content-Type': 'text/json' });
  res.write(JSON.stringify(json));
  res.end();
})

app.delete('/api/logout-all', async (req, res) => {

  console.log(req.body.token);

  await sql`
    DELETE FROM user_tokens
    WHERE user_id in (
        SELECT user_id
        FROM user_tokens
        WHERE user_token = ${req.body.token}
    ) 
  `;

  json = {
    errCode: 0,
    message: "Succesfully logged out from all devices",
  }

  res.writeHead(200, { 'Content-Type': 'text/json' });
  res.write(JSON.stringify(json));
  res.end();
})

app.post('/api/sign-up', async (req, res) => {

  console.log(req.body);
  const data = req.body;
  const email = req.body.email;
  const password = req.body.password;
  const passwordrepeat = req.body.passwordrepeat;

  if (isEmpty(email) || isEmpty(password) || password !== passwordrepeat || isEmpty(passwordrepeat)) {
    json = {
      errCode: 2,
      token: "All fields are required",
    }

  }
  else {

    let users = await sql`
        SELECT user_id
        FROM users
        WHERE email = ${email.trim()}
      `;

    if (users.length !== 0) {

      json = {
        errCode: 3,
        token: "User with such email already exists.",
      }
      alert("User exists")

    }

    else {

      await sql`
            INSERT INTO users 
              ( email, password)
            VALUES 
              (${email.trim()}, ${password.trim()})
          `;

      users = await sql`
            SELECT user_id
            FROM users
            WHERE email = ${email.trim()}
          `;

      var token = create_UUID();

      await sql`
            INSERT INTO user_tokens 
              (user_token, user_id)
            VALUES 
              (${token}, ${users[0].user_id})
          `;
      json = {
        errCode: 0,
        token: token,
      }
      res.sendFile("static/home-page.html", { root: __dirname });
    }
  }
});

app.get('/api/getUserProfile', async (req, res) => {

  const userId = await sql`
    SELECT T.user_id, U.email
    FROM public.user_tokens AS T
    INNER JOIN public.users AS U ON T.user_id = U.user_id
    WHERE T.user_token = ${req.body.token}
  `;

  if (userId.length === 0) {
    json = {
      errCode: 4,
      errMessage: 'Invalid token'
    }
  } else {
    json = {
      errCode: 0,
      userInfo: {
        email: userId[0].email,
        userId: userId[0].user_id
      }
    }}
    res.writeHead(200, { 'Content-Type': 'text/json' });
    res.write(JSON.stringify(json));
    res.end();
  });

app.put('/api/updateUserProfile', async (req, res) => {

  await sql`
  UPDATE users
  SET email = ${req.body.email}
  WHERE user_id = (SELECT user_id FROM user_tokens WHERE user_token = ${req.body.token})
`;


  json = {
    errCode: 0,
    message: 'Email succesfully changed'
  }

  res.writeHead(200, { 'Content-Type': 'text/json' });
  res.write(JSON.stringify(json));
  res.end();
});

app.listen(8080, () => {
  console.log('MyShop backend started on port 8080')
})

function create_UUID() {
  var dt = new Date().getTime();
  var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = (dt + Math.random() * 16) % 16 | 0;
    dt = Math.floor(dt / 16);
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return uuid;
}

function isEmpty(str) {
  if (str === null || str === undefined) {
    return true;
  }
  if (str.trim && str.trim().length === 0) {
    return true;
  }
  return false;
}


