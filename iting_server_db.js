var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var router = require('./iting_router_db');
var passport = require('passport');
var FacebookTokenStrategy = require('passport-facebook-token');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(passport.initialize());
app.use(passport.session());

// app.use(function(err, req, res, next){
// 	if(err){
// 		console.log(err)
// 	}
// 	next()
// })



// app.all('/', function(req, res, next) {
//     // set origin policy etc so cross-domain access wont be an issue

//     res.header("Access-Control-Allow-Origin", "*");
//     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With,  Content-Type, Accept");
//     console.log(req.body);
//     next();
// });
// app.post('/', function(req, res) {
//     if(!Object.keys(req.body))
//         res.json('all good');
//     else
//         res.json({
//             success: false,
//             error: "json invalid"
//         }, 400);


// });

passport.use('facebook-token', new FacebookTokenStrategy({
	 clientID : **,
	 clientSecret : '****'
 },
	 function(accessToken, refreshToken, profile, done) {
		 // 사용자 찾거나, 신규 등록
		 User.findOrCreate(profile, function (err, user) {
		 	return done(err, user);
		 });
	 }
));

app.post('/auth/facebook/token', passport.authenticate('facebook-token'), function (req, res){
// do something with req.user
	var token = req.body.facebook_token;
	if(token){
		console.log('token = ', token);
	}
	if(profile){
		console.log('profile = ', profile);
	}
	if(user){
		console.log('user = ', user);
	}
	if(done){
		console.log('done = ', done);
	}
 if (req.isAuthenticated()){
	 res.sendStatus(200);
 }
 else {
	 res.sendStatus(401);
 }
});

app.post('/auth/google', router.googleAuth);

app.post('/message/send/room', router.sendMessageRoom);
app.post('/message/send', router.sendMessage);
// OLD app.post('/message/send', router.sendMessage);
app.get('/message/read/:user_num/:room_num', router.readMessage);
// SPEED TEST app.get('/message/readtest/:user_num/:user_numb/:room_num', router.readMessageTest);
// app.get('/message/:my_user_num/:other_user_num', router.readMessage);
app.get('/messagelist/:user_num', router.showMessageList);

app.post('/profile/gcm', router.addNewGCM);
app.post('/profile/like/delete', router.deleteLike)
app.post('/profile/like/add', router.addLike)
app.post('/profile/picture/:user_num', router.uploadProfilePicture);
app.post('/profile/reference', router.writeReference);
app.post('/profile/update/user_learn/:user_num', router.updateProfileUserLearn);
app.post('/profile/update/user_teach/:user_num', router.updateProfileUserTeach);
app.post('/profile/update/detail/:user_num', router.updateProfileDetail);
app.post('/profile/update/nickname/:user_num', router.updateProfileNickname);
app.post('/profile', router.addProfile);
app.get('/profile/:my_user_num/:other_user_num', router.showProfile);


app.post('/meeting/delete/received', router.deleteReceivedMeetingList);
app.post('/meeting/delete/sent', router.deleteSentMeetingList);
app.post('/meeting/add', router.addMeetingList);
app.post('/meeting/request/reject', router.rejectRequest);
app.post('/meeting/request/accept', router.acceptRequest);
app.post('/meeting/requestin', router.showMeetingListRequestIn)
app.post('/meeting/requestout', router.showMeetingListRequestOut);
app.get('/meeting/:user_num', router.showMeetingList);

app.post('/friendlist/delete', router.deleteFriend);
app.post('/friendlist/add', router.addFriend);
app.get('/friendlist/:user_num', router.showFriendList);

app.post('/bookmark/delete', router.deleteBookmark);
app.post('/bookmark/add', router.addBookmark);
app.get('/bookmark/:user_num', router.showBookmarkList);

app.get('/board/search', router.searchPosting);
app.post('/board/delete', router.deletePosting);
app.post('/board/update', router.updatePosting);
app.post('/board', router.writePosting);
app.get('/board/:user_num/:num', router.readPosting);
app.get('/board', router.showList);

app.get('/board/querytest', router.queryTest);
app.listen(3000);
