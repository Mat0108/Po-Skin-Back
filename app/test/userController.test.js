const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const app = require('../../server.js'); // Replace with the path to your Express app
const nodemailer = require('nodemailer')
const { expect } = chai;

chai.use(chaiHttp);

const User = require("../models/userModel.js");
const bcrypt = require("bcrypt");
const mongoose = require('mongoose')
const db = require("../models");
let findStub, findOneStub, findByIdStub, findOneAndUpdateStub, findByIdAndUpdateStub, findByIdAndRemoveStub, saveStub, compareStub;
let hashStub, callApiStub, nodemailerStub;




describe('User Controller Tests', () => {
  beforeEach(()=>{
    callApiStub = sinon.stub(db.mongoose, 'connect').returns(Promise.resolve());
    
  })
  afterEach(()=>{
    callApiStub.restore();
  }) 
  describe('POST /user/register', () => {
    afterEach(() => {
      saveStub.restore();
      hashStub.restore();
      
    });
    it('should register a new user successfully', async () => {
      saveStub = sinon.stub(User.prototype, 'save').yields(null, { _id: 'mockedUserId' });
      hashStub = sinon.stub(bcrypt, 'hash').yields(null, 'hashedPassword');
      
      const res = await chai.request(app)
        .post('/user/register')
        .send({user:{
          password: 'testPassword',
          email: 'test@example.com',
          firstname: 'John',
          lastname: 'Doe',
    },language:'fr'});
      expect(res).to.have.status(200);
      expect(res.body).to.have.property('message').to.include('Utilisateur créé');
      expect(res.body).to.have.property('data').to.have.property('_id').to.equal('mockedUserId');
    });

    it('should handle registration failure due to missing fields', async () => {
      const res = await chai.request(app)
        .post('/user/register')
        .send({
          // Missing required fields
        });

      expect(res).to.have.status(401);
      expect(res.body).to.have.property('message').to.equal('Mot de passe est vide');
    });
  });
  

  describe('POST /user/login', () => {
    afterEach(()=>{
      findOneStub.restore();
      compareStub.restore()
    })
    it('should log in a user successfully', async () => {
      findOneStub = sinon.stub(User, 'findOne').yields(null, {
        _id: 'mockedUserId',
        email: 'test@example.com',
        password: 'hashedPassword',
        connected: false,
        save: sinon.stub().yields(null, {
          _id: 'mockedUserId',
          email: 'test@example.com',
          password: 'hashedPassword',
          connected: true,
        }),
      });
      compareStub = sinon.stub(bcrypt, 'compare').yields(null, true);
      const res = await chai.request(app)
        .post('/user/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword',
        });

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('message').to.include('Utilisateur connecté');
      expect(res.body).to.have.property('user').to.have.property('_id').to.equal('mockedUserId');
      expect(res.body).to.have.property('user').to.have.property('connected').to.equal(true);
    });
    it('should handle login failure due to user not found', async () => {
      //Mock User.findOne for login failure
      findOneStub = sinon.stub(User, 'findOne').yields('Login error');

      const res = await chai.request(app)
        .post('/user/login')
        .send({
          email: 'test@example.com',
          password: 'testPassword',
        });

      expect(res).to.have.status(500);
      expect(res.body).to.have.property('message').to.equal('Utilisateur non trouvé');
    });
    it('should handle login failure due to incorrect password', async () => {
      findOneStub = sinon.stub(User, 'findOne').yields(null, {
        _id: 'mockedUserId',
        email: 'test@example.com',
        password: 'hashedPassword',
        connected: false,
      });
      compareStub = sinon.stub(bcrypt, 'compare').callsFake((plainPassword, hashedPassword, callback) => {
        //Simulate an error
        const error = new Error("Mot de passe incorrect");
        callback(error);
      });
      const res = await chai.request(app)
        .post('/user/login')
        .send({
          email: 'test@example.com',
          password: 'incorrectPassword',
        });

      expect(res).to.have.status(401);
      expect(res.body).to.have.property('message').to.equal('Mot de passe incorrect');
    });
  })


  describe('POST /logout', () => {
    afterEach(()=>{
      findByIdStub.restore();
    })
    it('should log out a user successfully', async () => {
      findByIdStub = sinon.stub(User, 'findById').yields(null, {
        _id: 'mockedUserId',
        connected: true,
        save: sinon.stub().yields(null, {
          _id: 'mockedUserId',
          connected: false,
        }),
      });
      const res = await chai.request(app)
        .post('/user/logout/mockedUserId'); // Replace with an actual user ID
      expect(res).to.have.status(200);
      expect(res.body).to.have.property('message').to.include('Utilisateur déconnecté');
    });
    it('should handle logout failure due to user not found', async () => {
      findByIdStub = sinon.stub(User, 'findById').callsFake((userId, callback) => {
        const error = new Error("Utilisateur connecté non trouvé");
        callback(error);
      });
      const res = await chai.request(app)
        .post('/user/logout/notmockedUserId'); // Replace with an actual user ID
      expect(res).to.have.status(401);
      expect(res.body).to.have.property('message').to.equal('Utilisateur connecté non trouvé');
    });
  });

  describe('GET /users', () => {
    afterEach(()=>{
      if(findStub){findStub.restore()}
    })
    it('should get all users successfully', async () => {
      //Mock User.find for successful retrieval of users
       findStub = sinon.stub(User, 'find').returns({
        exec: sinon.stub().yields(null, [
          { _id: 'user1', email: 'user1@example.com' },
          { _id: 'user2', email: 'user2@example.com' },
        ]) // Replace `mockUsers` with your array of user objects
      });

      const res = await chai.request(app)
        .get('/users');

      expect(res).to.have.status(200);
      expect(res.body).to.be.an('array').to.have.lengthOf(2);
      expect(res.body[0]).to.have.property('_id').to.equal('user1');
      expect(res.body[1]).to.have.property('_id').to.equal('user2');
    });

    it('should handle user retrieval failure', async () => {
      //Mock User.find for retrieval failure
      findStub = sinon.stub(User, 'find').returns({
        exec: sinon.stub().yields(new Error("Erreur serveur"), null) // Simulating an error scenario
      });
      const res = await chai.request(app)
        .get('/users');

      expect(res).to.have.status(500);
      expect(res.body).to.have.property('message').to.equal('Erreur serveur');
    });
  });


  describe('GET /users/:userId', () => {
    afterEach(()=> {
      findByIdStub.restore();
    })
    it('should get a user by ID successfully', async () => {
      //Mock User.findById for successful retrieval of a user

      findByIdStub = sinon.stub(User, 'findById').returns({
          exec: sinon.stub().yields(null, {_id:"mockedUserId",email:"test@example.com"}) // Replace `mockUser` with your mock user object
        });
      const res = await chai.request(app)
        .get('/user/mockedUserId'); 
      expect(res).to.have.status(200);
      expect(res.body).to.have.property('_id').to.equal('mockedUserId');
      expect(res.body).to.have.property('email').to.equal('test@example.com');
    });

    it('should handle user retrieval failure by ID', async () => {
      //Mock User.findById for retrieval failure
      findByIdStub = sinon.stub(User, 'findById').returns({
        exec: sinon.stub().callsFake((callback) => {
          const error = new Error("Utilisateur connecté non trouvé");
          callback(error);
        })
      });
      const res = await chai.request(app)
        .get('/user/nonexistentUserId'); // Replace with a nonexistent user ID

      expect(res).to.have.status(401);
      expect(res.body).to.have.property('message').to.equal('Utilisateur connecté non trouvé');
    });
});

  describe('PUT /users/:userId', () => {
    afterEach(()=> {
      if(findOneAndUpdateStub){findOneAndUpdateStub.restore();}
    })
    it('should put a user by ID successfully', async () => {
      findOneAndUpdateStub = sinon.stub(User, 'findOneAndUpdate').resolves({ _id: 'mockedUserId', email:'test@example.com' });
      const res = await chai.request(app)
        .put('/user/mockedUserId') 
        .send({email:'text@exemple.com'})
      expect(res).to.have.status(200);
      expect(res.body).to.have.property('user').to.have.property('_id').to.equal('mockedUserId');
      expect(res.body).to.have.property('user').to.have.property('email').to.equal('test@example.com');
    });
    it('shound not put if user not found',async ()=>{
      findOneAndUpdateStub = sinon.stub(User, 'findOneAndUpdate').resolves(null);
      
      const res = await chai.request(app)
      .put('/user/notmockedUserId') 
      .send({email:'text2@exemple.com'})
    expect(res).to.have.status(404);
    expect(res.body).to.have.property('message').to.equal('Utilisateur non trouvé');
    })
    it('shound not put if erreur serveur',async ()=>{
      findOneAndUpdateStub = sinon.stub(User, 'findOneAndUpdate').rejects(new Error("Erreur serveur"));
      
      const res = await chai.request(app)
      .put('/user/notmockedUserId') 
      .send({email:'text2@exemple.com'})
    expect(res).to.have.status(500);
    expect(res.body).to.have.property('message').to.equal('Requête invalide');
    })
  });
  describe('Patch /users/:userId', () => {
    afterEach(()=> {
      if(findByIdAndUpdateStub){findByIdAndUpdateStub.restore();}
    })
    it('should patch a user by ID successfully', async () => {
      findByIdAndUpdateStub = sinon.stub(User, 'findByIdAndUpdate').resolves({ _id: 'mockedUserId', email:'test@example.com' });
      const res = await chai.request(app)
        .patch('/user/mockedUserId') 
        .send({email:'text@exemple.com'})
      expect(res).to.have.status(200);
      expect(res.body).to.have.property('user').to.have.property('_id').to.equal('mockedUserId');
      expect(res.body).to.have.property('user').to.have.property('email').to.equal('test@example.com');
    });
    it('shound not patch if user not found',async ()=>{
      findByIdAndUpdateStub = sinon.stub(User, 'findByIdAndUpdate').resolves(null);
      
      const res = await chai.request(app)
      .patch('/user/notmockedUserId') 
      .send({email:'text2@exemple.com'})
    expect(res).to.have.status(404);
    expect(res.body).to.have.property('message').to.equal('Utilisateur non trouvé');
    })
    it('shound not patch if erreur serveur',async ()=>{
      findByIdAndUpdateStub = sinon.stub(User, 'findByIdAndUpdate').rejects(new Error("Erreur serveur"));
      
      const res = await chai.request(app)
      .patch('/user/notmockedUserId') 
      .send({email:'text2@exemple.com'})
    expect(res).to.have.status(500);
    expect(res.body).to.have.property('message').to.equal('Erreur serveur');
    })
  });

  describe('delete /users/:userId', () => {
    afterEach(()=> {
      if(findByIdAndRemoveStub){findByIdAndRemoveStub.restore();}
    })
    it('should delete a user by ID successfully', async () => {
      findByIdAndRemoveStub = sinon.stub(User, 'findByIdAndRemove').resolves({user:{ _id: 'mockedUserId', email:'test@example.com' }});
      const res = await chai.request(app)
        .delete('/user/mockedUserId') 
        .send({email:'text@exemple.com'})
      expect(res).to.have.status(200);   
      expect(res.body).to.have.property('message').to.equal('Utilisateur est bien supprimé');
    });
    it('shound not delete if user not found',async ()=>{
      findByIdAndRemoveStub = sinon.stub(User, 'findByIdAndRemove').resolves(null);
      
      const res = await chai.request(app)
      .delete('/user/notmockedUserId') 
      .send({email:'text2@exemple.com'})
    expect(res).to.have.status(404);
    expect(res.body).to.have.property('message').to.equal('Utilisateur non trouvé');
    })
    it('shound not delete if erreur serveur',async ()=>{
      findByIdAndRemoveStub = sinon.stub(User, 'findByIdAndRemove').rejects(new Error("Erreur serveur"));
      
      const res = await chai.request(app)
      .delete('/user/notmockedUserId') 
      .send({email:'text2@exemple.com'})
    expect(res).to.have.status(500);
    expect(res.body).to.have.property('message').to.equal('Erreur serveur');
    })
  });


  describe('post /users/forgetpassword', () => {
    let transport = '';
    beforeEach(()=>{
      transport = {
        name: 'testsend',
        version: '1',
        sendMail: function sendMail(data, callback) {
            callback();
        },
        logger: false,
    };
      transport = nodemailer.createTransport(transport);
    })
    afterEach(() => {
      findOneStub.restore();
      if(nodemailerStub){nodemailerStub.restore();}
    });
  
    it('should not send password reset mail if user not found', async () => {
      findOneStub = sinon.stub(User, 'findOne').yields(false, false);
      const res = await chai.request(app)
        .post('/users/forgetpassword')
        .send({ email: 'email@example.com' });

      expect(res).to.have.status(400);
      expect(res.body).to.have.property('message').to.deep.equal('Utilisateur non trouvé')
    });

    it('should not send password reset mail if save error', async () => {
      findOneStub = sinon.stub(User, 'findOne').yields(null, { email: 'email@example.com',save:sinon.stub(User.prototype, 'save').yields(true,null)});
      const res = await chai.request(app)
        .post('/users/forgetpassword')
        .send({ email: 'email@example.com' });
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('message').to.deep.equal('Erreur serveur');
    });
  
    it('should not send password reset mail if mail error', async () => {
      findOneStub = sinon.stub(User, 'findOne').yields(null, { email: 'email@example.com', save: sinon.stub().yields(null,{_id:"mockeduserid",email:"test" }) });
      nodemailerStub = sinon.stub(transport, 'sendMail').yields(true,false);

      const res = await chai.request(app)
        .post('/users/forgetpassword')
        .send({ email: 'email@example.com' });
      expect(res).to.have.status(500);
      expect(res.body).to.have.property('message').to.deep.equal("Erreur lors de l'envoi de l'e-mail")});
  
    it('should send password reset mail ', async () => {
      findOneStub = sinon.stub(User, 'findOne').yields(null, { email: 'email@example.com', save: sinon.stub().yields(null,{_id:"mockeduserid",email:"email@example.com" }) });
      nodemailerStub = sinon.stub(transport, 'sendMail').yields(false);

      const res = await chai.request(app)
        .post('/users/forgetpassword')
        .send({ email: 'email@example.com' });
      expect(res).to.have.status(200);
      expect(res.body).to.deep.equal({ message: 'E-mail de réinitialisation envoyé avec succès' });
    });
    
  });

  describe('post /users/validatetoken', () => {
    afterEach(()=> {
      if(findOneStub){findOneStub.restore();}
    })
    it('should validate token if token is not expires', async () => {
      const user = {
        _id: 'mockedUserId',
        resetPasswordToken: 'someResetToken',
        resetPasswordExpires: new Date(Date.now() + 3600000)
      };
        findOneStub = sinon.stub(User, 'findOne').callsFake((query, callback) => {
        callback(null, user);
      });
      const res = await chai.request(app)
        .post('/users/validatetoken') 


      expect(res).to.have.status(200);   
      expect(res.body).to.have.property('message').to.equal('Token valide');
      expect(res.body).to.have.property('status').to.equal(true);
      expect(res.body).to.have.property('id').to.equal('mockedUserId');
    });
    it('shound not validate token if token is expires',async ()=>{
      const user = {
        resetPasswordToken: 'someResetToken',
        resetPasswordExpires: new Date(Date.now() - 3600000)
      };
        findOneStub = sinon.stub(User, 'findOne').callsFake((query, callback) => {
        callback(null, user);
      });
      
      const res = await chai.request(app)
      .post('/users/validatetoken') 

      expect(res).to.have.status(200);
      expect(res.body).to.have.property('message').to.equal('Token invalide');
      expect(res.body).to.have.property('status').to.equal(false);
    
    })
    it('shound not validate token if erreur serveur',async ()=>{
      findOneStub = sinon.stub(User, 'findOne').yields(new Error('Mocked error'), null);
  
      const res = await chai.request(app)
      .post('/users/validatetoken')

      
      expect(res).to.have.status(200);
      expect(res.body).to.have.property('message').to.equal('Token invalide');
      expect(res.body).to.have.property('status').to.equal(false);
    })
  });
  describe('post /users/editpassword', () => {
    afterEach(()=>{
      findOneStub.restore();
      hashStub.restore();
      findOneAndUpdateStub.restore();
    })
    it('shound not reset password if user not found',async ()=>{
      
      findOneStub = sinon.stub(User, 'findOne').yields(false,false);
      const res = await chai.request(app)
      .post('/users/editpassword')
      .send({
        email: 'test@example.com',
        password: 'testPassword',
      });
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('message').to.equal('Utilisateur non trouvé');
    })
    it('shound not reset password if findOne error',async ()=>{
      findOneStub = sinon.stub(User, 'findOne').yields(true);
      const res = await chai.request(app)
      .post('/users/editpassword')
      .send({
        email: 'test@example.com',
        password: 'testPassword',
      });
      expect(res).to.have.status(400);
      expect(res.body).to.have.property('message').to.equal('Utilisateur non trouvé');
    })
    it('shound not reset password if token expires',async ()=>{
      findOneStub = sinon.stub(User, 'findOne').yields(false,{_id:"mockedUserId",resetPasswordExpires:new Date(Date.now() - 3600000)});
      const res = await chai.request(app)
      .post('/users/editpassword')
      .send({
        email: 'test@example.com',
        password: 'testPassword',
      });
      expect(res).to.have.status(200);
      expect(res.body).to.have.property('message').to.equal('Token invalide');
    })
    it('shound not reset password if hash not work',async ()=>{
      findOneStub = sinon.stub(User, 'findOne').yields(false,{_id:"mockedUserId",resetPasswordExpires:new Date(Date.now() + 3600000)});
      hashStub = sinon.stub(bcrypt, 'hash').yields(true, false);
      const res = await chai.request(app)
      .post('/users/editpassword')
      .send({
        email: 'test@example.com',
        password: 'testPassword',
      });
      expect(res).to.have.status(500);
      expect(res.body).to.have.property('message').to.equal('Impossible de crypter le nouveau mot de passe');
    })
    it('shound not reset password if findOneAndUpdate error ',async ()=>{
      findOneStub = sinon.stub(User, 'findOne').yields(false,{_id:"mockedUserId",resetPasswordExpires:new Date(Date.now() + 3600000)});
      hashStub = sinon.stub(bcrypt, 'hash').yields(false, 'hashpassword');
      findOneAndUpdateStub = sinon.stub(User, 'findOneAndUpdate').rejects(new Error("Erreur serveur"));
      const res = await chai.request(app)
      .post('/users/editpassword')
      .send({
        email: 'test@example.com',
        password: 'testPassword',
      });
      expect(res).to.have.status(500);
      expect(res.body).to.have.property('message').to.equal('Erreur serveur');
    })
    it('shound reset password ',async ()=>{
      findOneStub = sinon.stub(User, 'findOne').yields(false,{_id:"mockedUserId",resetPasswordExpires:new Date(Date.now() + 3600000)});
      hashStub = sinon.stub(bcrypt, 'hash').yields(false, 'hashpassword');
      findOneAndUpdateStub = sinon.stub(User, 'findOneAndUpdate').resolves({ _id: 'mockedUserId', email:'test@example.com' });
      const res = await chai.request(app)
      .post('/users/editpassword')
      .send({
        email: 'test@example.com',
        password: 'testPassword',
      });
      expect(res).to.have.status(200);
      expect(res.body).to.have.property('message').to.equal('Utilisateur est bien mis à jour');
    })
  })


  describe('get /users/expert', () => {
    afterEach(()=> {
      if(findStub){findStub.restore();}
    })
    it('should returns all experts', async () => {
      const listuser = [{_id: 'mockedUserId1'},{_id: 'mockedUserId2'}];
      findStub = sinon.stub(User, 'find').callsFake((query, callback) => {
        callback(null, listuser);
      });
      const res = await chai.request(app)
        .get('/users/expert') 
      expect(res).to.have.status(200);   
      expect(res.body).to.have.property('message').to.equal('List Expert');
      expect(res.body).to.have.property('users').to.deep.have.members(listuser);
    });
    it('should not returns all experts if not found experts', async () => {
      findStub = sinon.stub(User, 'find').yields(false,false);
      const res = await chai.request(app)
        .get('/users/expert') 

      expect(res).to.have.status(400);   
      expect(res.body).to.have.property('message').to.equal('erreur api');
    });
    it('should not returns all experts if find error', async () => {
      findStub = sinon.stub(User, 'find').yields(true);
      const res = await chai.request(app)
        .get('/users/expert') 

      expect(res).to.have.status(400);   
      expect(res.body).to.have.property('message').to.equal('erreur api');
    });
  });

  describe('get /users/activate/:userId', () => {
    afterEach(()=> {
      if(findByIdAndUpdateStub){findByIdAndUpdateStub.restore();}
    })
    it('should activate account', async () => {
      findByIdAndUpdateStub = sinon.stub(User, 'findByIdAndUpdate').resolves({ _id: 'mockedUserId', email:'test@example.com' });
      const res = await chai.request(app)
        .patch('/user/mockedUserId') 
        .send({email:'text@exemple.com'})
      expect(res).to.have.status(200);
      expect(res.body).to.have.property('user').to.have.property('_id').to.equal('mockedUserId');
      expect(res.body).to.have.property('user').to.have.property('email').to.equal('test@example.com');
    });
    it('shound not  activate account if user not found',async ()=>{
      findByIdAndUpdateStub = sinon.stub(User, 'findByIdAndUpdate').resolves(null);
      
      const res = await chai.request(app)
      .patch('/user/notmockedUserId') 
      .send({email:'text2@exemple.com'})
    expect(res).to.have.status(404);
    expect(res.body).to.have.property('message').to.equal('Utilisateur non trouvé');
    })
    it('shound not  activate account if erreur serveur',async ()=>{
      findByIdAndUpdateStub = sinon.stub(User, 'findByIdAndUpdate').rejects(new Error("Erreur serveur"));
      
      const res = await chai.request(app)
      .patch('/user/notmockedUserId') 
      .send({email:'text2@exemple.com'})
    expect(res).to.have.status(500);
    expect(res.body).to.have.property('message').to.equal('Erreur serveur');
    })
  });
});

