var express = require("express"),

	bodyParser = require("body-parser"),
	
	mongoose = require("mongoose"),

	

	

	//Authentication tools
	passport 		= require("passport"),
	LocalStrategy 	= require("passport-local"),
	
	passportSocketIo = require('passport.socketio');
    cookieParser = require('cookie-parser');




	app     = express();

	//require all models

	server = require("http").createServer(app);

    io = require("socket.io").listen(server);

	User = require("./models/user");

	

	



	
	

    







//Connect a database
var url = process.env.DATABASEURL || "mongodb://localhost/chatApplication";
mongoose.connect(url);



app.set("view engine","ejs");

app.use(bodyParser.urlencoded({extended:true}));




app.use(bodyParser.json());


//Passport Authentication(Keep at end)

	//creating a session.
app.use(require("express-session")({
	
	secret:"My chat",
	resave: false,
	saveUninitialized: false,
	
  
}));


//Initialze a session and passport
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


//Using passport session for socket.io
io.use(passportSocketIo.authorize({
	  key: 'connect.sid',
	  
	 
	  passport: passport,
	  cookieParser: cookieParser
	}));



//Adding a function to all the paths
app.use(function(req,res,next){

	res.locals.currentUser=req.user;

	next();
});






//When The Conection is established and active.

io.sockets.on("connection",function(userSocket){
	console.log(userSocket.id);
	
	userSocket.on("sendMessage",function(data){

		//broadcasting message to users.

		io.sockets.emit("newMessage",data);
	});
});




//Root Routes
app.get("/",function(req,res){
	res.render("index");
});


//Chat Routes

app.get("/chat/:userid",isLoggedIn,function(req,res){
	res.render("chats/chat",{chatUser:req.user});
});


//Profile Routes;
app.get("/profile/:userid",isLoggedIn,function(req,res){
	User.find({isOnline:true,'_id': {$ne: req.user._id}},function(err,allActiveUsers){
		if(err){
			console.log(err);
		}else{
			
			
			res.render("user/profile",{currentUser:req.user,activeUsers:allActiveUsers});


		}
	})
	
});

//Response to jquery request.
app.get("/chatResponse/:userid",isLoggedIn,function(req,res){
	User.find({isOnline:true,'_id': {$ne: req.user._id}},function(err,allActiveUsers){
		if(err){
			console.log(err);
		}else{
			
			
			res.jsonp(allActiveUsers);


		}
	});

});


//Authentication Routes

//Login Routes
app.get("/login",function(req,res){
	res.render("authentication/login");
});


app.post("/login",passport.authenticate("local",{
	failureRedirect:"/login"
}),
	function(req,res){
	
	passport.authenticate("local")(req,res,function(err,user,info){
		//Finding the user
			User.findById(req.user._id,function(err,user){
				if(err){
					console.log(err);
				}else{
					//Setting its online field to true.
					user.isOnline = true;

					//Saving changes in the database.
					user.save(function(err){
						if(err){
							console.log(err);
						}else{
							res.redirect("/profile/"+req.user._id);
						}

					});
					
				}
			});
			
			
			
		});
		
					

});


//Register Routes
app.get("/register",function(req,res){
	res.render("authentication/register");
});


app.post("/register",function(req,res){
	//Get New User;
	
	var userName = new User({username:req.body.username});
	
		//Register the new User
	User.register(userName,req.body.password,function(err,user){
		if(err){
			
			console.log(err);
			return res.render("authentication/register");
		}
		
		
		
		passport.authenticate("local")(req,res,function(){

			User.findById(req.user._id,function(err,user){
			if(err){
				console.log(err);
			}else{
				user.isOnline = true;

				user.save(function(err){
						if(err){
							console.log(err);
						}else{
							res.redirect("/profile/"+req.user._id);
							
						}

				});

			}

			});
					
			
		});
			
		
	});

});

app.get("/logout/:id",function(req,res){
	
	
	//Finding the logged out user.
	User.findById(req.params.id,function(err,disconnectedUser){
		if(err){
			console.log(err);
		}else{
			disconnectedUser.isOnline = false;

			disconnectedUser.save(function(err){
						if(err){
							console.log(err);
						}else{
							//Logging out our request
							req.logout();

							res.redirect("/");
						

						}

			});

		}
	});



});

function isLoggedIn(req,res,next){
	if(req.isAuthenticated()){
		return next();
	}
	else{
		res.redirect("/login");
	}
}






server.listen(3000,function(req,res){
	console.log("Connected on server");
});