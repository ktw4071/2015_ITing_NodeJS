var express = require('express');
var router = express.Router();
var mysql = require('mysql');
var setting = require('./config/dbconfig.js');
var pool = mysql.createPool(setting);
var gcm = require('node-gcm');


var moment = require('moment');
var formidable = require('formidable');
var fs = require('fs');
var pathUtil = require('path');
var easyimge = require('easyimage');
var AWS = require('aws-sdk');

var uploadDir = __dirname +'/upload';
var thumbnailDir = __dirname + '/thumbnail';
moment.locale('ko');


// var connection = mysql.createConnection(setting);
// connection.connect(function(err){
// 	if(err){}
// 	else{}
// })

// exports.showProfile = function(req, res, next){
// 		var user_num = req.params.user_num;
// 		var sql = "SELECT * FROM user a, reference b WHERE a.user_num = ? AND b.reader_user_num = ?"
// 		pool.getConnection(function(req, conn){
// 			conn.query(sql, [user_num, user_num], function(err, result){
// 				res.json({profile : result});
// 				conn.release();
// 		})
// 	})
// }
// var pool = mysql.createPool({
// 	connectionLimit : 100,
// 	host : 'localhost',
// 	user : 'root',
// 	password : '1234',
// 	database : 'iting'
// });

exports.queryTest = function(req, res, next){
	var query = req.query;
	console.log('req.query = ', req.query);

	var content = query.content;
	var user_num = query.user_num;

		pool.getConnection(function(err, conn){
			var sql = "INSERT INTO board (content, user_num) VALUES (?, ?)";
			var data = [content, user_num];
			conn.query(sql, data, function(err, result){
					if (err)
					return next (err);
					console.log('result', result);
					//res.json({"result" : "OK"});
					if(result.affectedRows == 1){
						res.redirect('/board');
					}
					else {
						res.json({"msg" : "fail"});
					}
					//res.redirect('/list');
					conn.release();
		});
	});
};

exports.googleAuth = function(req, res, next){
	var gmail = req.body.gmail;
	console.log('New Email! - ', gmail);
	var sql =  "INSERT INTO user (user_id, nickname) VALUES (?, ?)"
	var sql2 = "SELECT user_num FROM user WHERE user_id = ?"
	var random_nickname = makeid();

	function makeid()
	{
	    var text = "";
	    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

	    for( var i=0; i < 10; i++ )
	        text += possible.charAt(Math.floor(Math.random() * possible.length));

	    return text;
	}

	pool.getConnection(function(req, conn){
		conn.query(sql2, [gmail], function(err, old_user){
			if(err)
				res.json({'msg' : 'FAIL! Error in finding exising user_num !'})
			console.log('sdfzsf', old_user);
			if(old_user.length == 1)
			{
				res.json({'user_num' : old_user[0].user_num})
			}

			if(old_user.length < 1) {
				conn.query(sql, [gmail, random_nickname], function(err, result){
					if(err){
						console.log('err', err);
						res.statusCode = 301
						res.json({'msg' : 'You have same nickname ! Try login again !'})
					}
					else if(result.affectedRows == 1){
						conn.query(sql2, [gmail], function(err, new_user){
							if(err)
								res.json({'msg' : 'Cannot find user_num !'})
							else{
								res.json({'user_num' : new_user[0].user_num});
							}
						})
					}
				})
			}
			conn.release();
		})
	})
}

exports.sendMessageRoom = function(req, res, next){
	var body = req.body
	var my_user_num = body.my_user_num;
	var other_user_num = body.other_user_num;
	var message = body.message;
	var room_num = body.room_num;
	var message_date = new Date();

	var sql = "INSERT INTO message (sender_user_num, receiver_user_num, message, message_date, room_num) VALUES (?, ?, ?, ?, ?)"
	var sql2 = "UPDATE messagelist SET sender_user_num = ?, receiver_user_num = ?, message = ?, message_date = ?, alreadyread = ? WHERE room_num = ?"
	var sql3 = "SELECT push_reg_id FROM user WHERE user_num = ?"
	var sql4 = "SELECT nickname FROM user WHERE user_num = ?"

	if(my_user_num&&other_user_num&&message&&room_num){
		if(message.length > 1){
			pool.getConnection(function(err, conn){
				conn.query(sql, [my_user_num, other_user_num, message, message_date, room_num], function(err, msg){
					conn.query(sql2, [my_user_num, other_user_num, message, message_date, 0, room_num], function(err, room){
						if(err){
							res.json({'msg' : 'FAIL! Error in sending msg in, you are in chat room now !'})
						}

						else if(room.affectedRows == 1){
							// conn.query(sql3, [other_user_num], function(err, push){
							// 	conn.query(sql4, [my_user_num], function(err, sender){
							// 		console.log(push[0].push_reg_id);
							// 		var a = new Date();
							// 		var hours = a.getHours();
							// 		var suffix = hours >= 12 ? "PM":"AM";
							// 		hours = ((hours + 11) % 12 + 1)
							// 		var mins = a.getMinutes();
							// 		if(mins < 10){
							// 			mins = '0' + mins
							// 		}
							// 		var datetime = hours + ':' + mins + ' ' + suffix
							// 		var message = new gcm.Message({
							// 		    collapseKey: 'demo',
							// 		    delayWhileIdle: true,
							// 		    timeToLive: 3,
							// 		    data: {
							// 		        title: 'iting push msg',
							// 		        message: sender[0].nickname + '님의 메시지 ',
							// 		        // datetime : datetime
							// 		    }
							// 		});
							// 		var server_api_key = '****';
							// 		var sender = new gcm.Sender(server_api_key);
							// 		var registrationIds = [];
							// 		registrationIds.push(push[0].push_reg_id);

							// 		sender.send(message, registrationIds, 4, function (err, result) {
							// 		    console.log(result);
							// 		    console.log(message);
							// 			});

							// 		})
							// 	})
							var a = new Date();
							var hours = a.getHours();
							var suffix = hours >= 12 ? "PM":"AM";
							hours = ((hours + 11) % 12 + 1)
							var mins = a.getMinutes();
							if(mins < 10){
								mins = '0' + mins
							}
							var datetime = hours + ':' + mins + ' ' + suffix
						res.json({'t_message_date' : datetime, 'msg' : 'OK! You have sent a message!'});
					}
					else{
						res.json({'msg' : 'FAIL! Your message did not go through!'})
					}
				});
			});
			conn.release();
			})
		}
		else{
			res.json({'msg' : 'You have to write more than 1 letter at least!'})
		}
	}
	else{
		res.json({'msg' : 'Need key-value ! : my_user_num, other_user_num, message, room_num'})
	}
}

exports.sendMessage = function(req, res, next){
	var body = req.body
	console.log('body--', body);
	var my_user_num = body.my_user_num;
	var other_user_num = body.other_user_num;
	var message = body.message;
	var message_date = new Date();


	var sql = "SELECT room_num FROM messagelist WHERE (sender_user_num = ? AND receiver_user_num = ?) OR (sender_user_num = ? AND receiver_user_num = ?)"
	var sql2 = "INSERT INTO message (sender_user_num, receiver_user_num, message, message_date, room_num) VALUES (?, ?, ?, ?, ?)"
	var sql3 = "UPDATE messagelist SET sender_user_num = ?, receiver_user_num = ?, message = ?, message_date = ?, alreadyread = ? WHERE room_num = ?"

	var sql4 = "INSERT INTO messagelist (sender_user_num, receiver_user_num, message, message_date) VALUES (?, ?, ?, ?)"
	var sql5 = "SELECT room_num FROM messagelist WHERE sender_user_num = ? AND receiver_user_num = ?"
	var sql6 = "INSERT INTO message (sender_user_num, receiver_user_num, message, message_date, room_num) VALUES (?, ?, ?, ?, ?)"

	var sql7 = "SELECT push_reg_id FROM user WHERE user_num = ?"
	var sql8 = "SELECT nickname FROM user WHERE user_num = ?"

	if(my_user_num&&other_user_num&&message){
		if(message.length > 1){
			pool.getConnection(function(err, conn){
				conn.query(sql, [my_user_num, other_user_num, other_user_num, my_user_num], function(err, result){
					console.log(result);
					if(result.length == 1){
						var yes_room_num = result[0].room_num;
						conn.query(sql2, [my_user_num, other_user_num, message, message_date, yes_room_num], function(err, result2){
							conn.query(sql3, [my_user_num, other_user_num, message, message_date, 0, yes_room_num], function(err, result3){
								if(err){
									res.json({'msg' : '(YES ROOM_NUM CASE) FAIL! Error in putting data in messagelist!'})
								}

								else if(result3.affectedRows == 1){
									// conn.query(sql7, [other_user_num], function(err, push){
									// 	conn.query(sql8, [my_user_num], function(err, sender){
									// 		console.log(push[0].push_reg_id);
									// 		var message = new gcm.Message();
									// 		var a = new Date();
									// 		var hours = a.getHours();
									// 		var suffix = hours >= 12 ? "PM":"AM";
									// 		hours = ((hours + 11) % 12 + 1)
									// 		var mins = a.getMinutes();
									// 		if(mins < 10){
									// 			mins = '0' + mins
									// 		}
									// 		var datetime = a.getMonth() + '.' + a.getDate() + ' ' + hours + ':' + mins + ' ' + suffix
									// 		var message = new gcm.Message({
									// 		    collapseKey: 'demo',
									// 		    delayWhileIdle: true,
									// 		    timeToLive: 3,
									// 		    data: {
									// 		        title: 'iting push msg',
									// 		        message: sender[0].nickname + '님의 메시지 ',
									// 		        datetime : datetime
									// 		    }
									// 		});

									// 		var server_api_key = '****';
									// 		var sender = new gcm.Sender(server_api_key);
									// 		var registrationIds = [];
									// 		registrationIds.push(push[0].push_reg_id);

									// 		sender.send(message, registrationIds, 4, function (err, result) {
									// 		    console.log(result);
									// 		});

									// 	});
									// })
									var a = new Date();
									var hours = a.getHours();
									var suffix = hours >= 12 ? "PM":"AM";
									hours = ((hours + 11) % 12 + 1)
									var mins = a.getMinutes();
									if(mins < 10){
										mins = '0' + mins
									}
									var datetime = hours + ':' + mins + ' ' + suffix
									res.json({'msg' : "(YES ROOM_NUM CASE) OK! You have succeeded in putting data in messagelist!", t_message_date : datetime})
								}

								else{
									res.json({'msg' : '(YES ROOM_NUM CASE) No Error! But, failed in putting data!'})
								}
							})
						})
					}
					else if(result.length < 1){
						conn.query(sql4, [my_user_num, other_user_num, message, message_date], function(err, result4){
							conn.query(sql5, [my_user_num, other_user_num], function(err, result5){
									if(result5.length == 1){
										var no_room_num = result5[0].room_num;
										conn.query(sql6, [my_user_num, other_user_num, message, message_date, no_room_num], function(err, result6){
											if(err){
												res.json({'msg' : '(NO ROOM_NUM CASE) FAIL! Error in putting data in message'})
											}

											else if(result6.affectedRows == 1){
												// conn.query(sql7, [other_user_num], function(err, push){
												// 	conn.query(sql8, [my_user_num], function(err, sender){
												// 		var message = new gcm.Message();
												// 		var a = new Date();
												// 		var hours = a.getHours();
												// 		var suffix = hours >= 12 ? "PM":"AM";
												// 		hours = ((hours + 11) % 12 + 1)
												// 		var mins = a.getMinutes();
												// 		if(mins < 10){
												// 			mins = '0' + mins
												// 		}
												// 		var datetime = a.getMonth() + '.' + a.getDate() + ' ' + hours + ':' + mins + ' ' + suffix
												// 		var message = new gcm.Message({
												// 		    collapseKey: 'demo',
												// 		    delayWhileIdle: true,
												// 		    timeToLive: 3,
												// 		    data: {
												// 		        title: 'iting push msg',
												// 		        message: sender[0].nickname + '님의 메시지 ',
												// 		        datetime : datetime
												// 		    }
												// 		});

												// 		var server_api_key = '****';
												// 		var sender = new gcm.Sender(server_api_key);
												// 		var registrationIds = [];
												// 		registrationIds.push(push[0].push_reg_id);
												// 		sender.send(message, registrationIds, 4, function (err, result) {
												// 		    console.log(result);
												// 		});
												// 	});
												// })
												var a = new Date();
												var hours = a.getHours();
												var suffix = hours >= 12 ? "PM":"AM";
												hours = ((hours + 11) % 12 + 1)
												var mins = a.getMinutes();
												if(mins < 10){
													mins = '0' + mins
												}
												var datetime = hours + ':' + mins + ' ' + suffix
												res.json({'msg' : '(NO ROOM_NUM CASE) OK! You have succeeded in putting data in message!', t_message_date : datetime})
											}

											else{
												res.json({'msg' : '(NO ROOM_NUM CASE) No Error! But, failed in putting data'})
											}
										})
								}
								else if(result5.length < 1){
									res.json({'msg' : '(NO ROOM_NUM CASE) Cannot find room_num!'})
								}
							})
						})
					}
				})
				conn.release();
			})
		}
	}
	else
	{
		res.json({'msg' : 'FAIL ! Need key-value for : my_user_num, other_user_num, message !'})
	}
}

exports.readMessage = function(req, res, next){
	var user_num = req.params.user_num;
	// var user_numb = req.params.user_numb;
	var room_num = req.params.room_num;
	// console.log(user_numb);
	var sql = "SELECT b.*, a.nickname, a.user_num, a.pic FROM user a, message b WHERE b.room_num = ? AND (b.sender_user_num = a.user_num OR receiver_user_num = a.user_num) AND (a.user_num <> ?)"
	// -- sql2 에서 데이터 [roo_num] - > [room_num, user_num]
	// var sql4 = "SELECT nickname, pic, user_num FROM user WHERE user_num = ?"
	// var sql2 = "SELECT * FROM message WHERE room_num = ?"
	var sql3 = "UPDATE messagelist SET alreadyread = 1 WHERE room_num = ? AND receiver_user_num = ?"
	pool.getConnection(function(err, conn){
		conn.query(sql3, [room_num, user_num], function(err, result){
			// conn.query(sql2, [room_num], function(err, msg){
				conn.query(sql, [room_num, user_num], function(err, msg){
					// conn.query(sql4, [user_numb], function(err, user){
				console.log('read messages in the room - ' + room_num);
				for(var i in msg){
					var now = new Date();
					var today = now.getFullYear() + '.' + now.getMonth() + '.' + now.getDate();
					var before = msg[i].message_date;
					var msg_date = msg[i].message_date.getFullYear() + '.' + msg[i].message_date.getMonth() + '.' + msg[i].message_date.getDate();
					var hours = msg[i].message_date.getHours();
					var suffix = hours >= 12 ? "PM":"AM";
					var datetime;
					hours = ((hours + 11) % 12 + 1)
					var mins = msg[i].message_date.getMinutes()
					if(msg[i].message_date.getMinutes() < 10){
						mins = '0' + msg[i].message_date.getMinutes();
					}
					if(today == msg_date){
						datetime = hours + ':' + mins + ' ' + suffix
					}
					else{
						datetime = msg[i].message_date.getMonth() + '.' + msg[i].message_date.getDate() + ' ' + hours + ':' + mins + ' ' + suffix
					}
					msg[i]['t_message_date'] = datetime;
					var mymessage = false;
					if(msg[i].sender_user_num == user_num){
						mymessage = true;
						msg[i]['mymessage'] = mymessage;
					}
					else{
						msg[i]['mymessage'] = mymessage;
					}
				}
				res.json({msg : msg})
					// })
				// })
			})
		})
		conn.release();
	})
}
// OLD READ MESSAGE
// exports.readMessage = function(req, res, next){
// 	var my_user_num = req.params.my_user_num;
// 	var other_user_num = req.params.other_user_num;

// 	var sql = "SELECT message, message_date, sender_user_num, alreadyread FROM message WHERE (sender_user_num = ? AND receiver_user_num = ?) OR (sender_user_num = ? AND receiver_user_num = ?)"

// 	pool.getConnection(function(err, conn){
// 		conn.query(sql, [my_user_num, other_user_num, other_user_num, my_user_num], function(err, msg){
// 			console.log('read msg between user ' + my_user_num + ' and ' + other_user_num);
// 			for(var i in msg){
// 				var now = new Date();
// 				var today = now.getFullYear() + '.' + now.getMonth() + '.' + now.getDate();
// 				var before = msg[i].message_date;
// 				var msg_date = msg[i].message_date.getFullYear() + '.' + msg[i].message_date.getMonth() + '.' + msg[i].message_date.getDate();
// 				var hours = msg[i].message_date.getHours();
// 				var suffix = hours >= 12 ? "PM":"AM";
// 				var datetime;
// 				hours = ((hours + 11) % 12 + 1)
// 				var mins = msg[i].message_date.getMinutes()
// 				if(msg[i].message_date.getMinutes() < 10){
// 					mins = '0' + msg[i].message_date.getMinutes();
// 				}
// 				if(today == msg_date){
// 					datetime = hours + ':' + mins + ' ' + suffix
// 				}
// 				else{
// 					datetime = msg[i].message_date.getMonth() + '.' + msg[i].message_date.getDate() + ' ' + hours + ':' + mins + ' ' + suffix
// 				}
// 				msg[i]['t_message_date'] = datetime;
// 				var mymessage = false;
// 				if(msg[i].sender_user_num == my_user_num){
// 					mymessage = true;
// 					msg[i]['myMessage'] = mymessage;
// 				}
// 				else{
// 					msg[i]['myMessage'] = mymessage;
// 				}
// 			}
// 			res.json({msg : msg});
// 			conn.release();
// 		})
// 	})
// }

// OLD SEND MESSAGE
// exports.sendMessage = function(req, res, next){
// 	var body = req.body;
// 	var my_user_num = body.my_user_num;
// 	var other_user_num = body.other_user_num;
// 	var my_message = body.message;
// 	var message_date = new Date();
// 	console.log('body=', body);

// 	var sql = "SELECT nickname FROM user WHERE user_num = ?"
// 	var sql2 = "SELECT push_reg_id FROM user WHERE user_num = ?"
// 	var sql3 = "INSERT INTO message (sender_user_num, receiver_user_num, message, message_date) VALUES (?, ?, ?, ?)"
// 	if(my_user_num&&other_user_num&&my_message){
// 		if(my_message.length > 1){
// 			pool.getConnection(function(err, conn){
// 					conn.query(sql3, [my_user_num, other_user_num, my_message, message_date], function(err, msg_query){
// 						conn.query(sql2, [other_user_num], function(err, push){
// 							conn.query(sql, [my_user_num], function(err, sender){
// 								if (err)
// 								{
// 									res.json({"msg" : "FAIL! Error in sending your msg!"});
// 								}

// 								var message = new gcm.Message();
// 								var a = new Date();
// 								var hours = a.getHours();
// 								var suffix = hours >= 12 ? "PM":"AM";
// 								hours = ((hours + 11) % 12 + 1)
// 								var datetime = a.getMonth() + '.' + a.getDate() + ' ' + hours + ':' + a.getMinutes() + ' ' + suffix
// 								var message = new gcm.Message({
// 								    collapseKey: 'demo',
// 								    delayWhileIdle: true,
// 								    timeToLive: 3,
// 								    data: {
// 								        title: 'iting push msg',
// 								        message: sender[0].nickname + '님의 메시지 ' + message,
// 								        datetime : datetime
// 								    }
// 								});

// 								var server_api_key = '****';
// 								var sender = new gcm.Sender(server_api_key);
// 								var registrationIds = [];
// 								registrationIds.push(push[0].push_reg_id);

// 								sender.send(message, registrationIds, 4, function (err, result) {
// 								    console.log(result);
// 								});

// 								if(msg_query.affectedRows == 1){
// 									res.json({'msg' : 'OK! You have sent a message'})
// 								}

// 								else{
// 									res.json({'msg' : 'FAIL! Your message did not go through!'})
// 								}
// 								conn.release();
// 						})
// 					})
// 				})
// 			})
// 		}
// 		else{
// 			res.json({'msg' : 'FAIL! You have to write a message more than 1 letter at least'})
// 		}
// 	}
// 	else{
// 		res.json({'msg' : 'FAIL! You need to put key-value; my_user_num, other_user_num, message'})
// 	}
// }

exports.showMessageList = function(req, res, next){
	var user_num = req.params.user_num;
	var sql = "SELECT b.*, a.pic, a.nickname, a.user_num, a.push_reg_id FROM user a, messagelist b WHERE (b.sender_user_num = ? OR b.receiver_user_num = ?) AND (a.user_num = b.sender_user_num OR a.user_num = b.receiver_user_num) AND (a.user_num <> ?) ORDER BY b.message_date DESC"
	pool.getConnection(function(err, conn){
		conn.query(sql, [user_num, user_num, user_num], function(err, list){
			if(err){
				console.log(err);
				res.json({'msg' : 'FAIL! You cannot load any msg list!'})
			}

			else{
				for(var i in list){
					list[i]['new'] = false;
					if(list[i].receiver_user_num == user_num){
						if(list[i].alreadyread == 0){
							list[i]['new'] = true;
						}
					}

					var now = new Date();
					var today = now.getFullYear() + '.' + now.getMonth() + '.' + now.getDate();
					var before = list[i].message_date;
					var msg_date = list[i].message_date.getFullYear() + '.' + list[i].message_date.getMonth() + '.' + list[i].message_date.getDate();
					var hours = list[i].message_date.getHours();
					var suffix = hours >= 12 ? "PM":"AM";
					var datetime;
					hours = ((hours + 11) % 12 + 1)
					var mins = list[i].message_date.getMinutes()
					if(list[i].message_date.getMinutes() < 10){
						mins = '0' + list[i].message_date.getMinutes();
					}
					if(today == msg_date){
						datetime = hours + ':' + mins + ' ' + suffix
					}
					else{
						datetime = list[i].message_date.getMonth() + '.' + list[i].message_date.getDate() + ' ' + hours + ':' + mins + ' ' + suffix
					}
					list[i]['t_message_date'] = datetime;

				}
				res.json({list : list})
			}
		})
		conn.release();
	})
}

exports.addNewGCM = function(req, res, next){
	var user_num = req.body.user_num;
	var push_reg_id = req.body.push_reg_id;

	var sql = "UPDATE user SET push_reg_id = ? WHERE user_num = ?"

	pool.getConnection(function(err, conn){
		conn.query(sql, [push_reg_id, user_num], function(err, result){
			if(err){
				res.json({"msg" : "ERROR! You cannot get a GCM key!"})
			}

			else if(result.affectedRows == 1){
				res.json({"msg" : "OK! Now you have a GCM push key!"})
			}

			else{
				res.json({"msg" : "FAIL! You cannot get a GCM Key!"})
			}
		})
	})
}

exports.deleteLike = function(req, res, next){
	var likegiver_user_num = req.body.likegiver_user_num;
	var liketaker_user_num = req.body.liketaker_user_num;

	var sql1 = "DELETE FROM profile_like WHERE likegiver_user_num = ? AND liketaker_user_num = ?"
	var sql2 = "UPDATE user SET total_like = total_like -1 WHERE user_num = ?"
		pool.getConnection(function(err, conn){
			conn.query(sql2, [liketaker_user_num], function(err, like){
				conn.query(sql1, [likegiver_user_num, liketaker_user_num], function(err, result){
					console.log('like---', like);
					if (err)
					{
						res.json({"msg" : "FAIL! You have already liked -1 this person !"});
					}
					// return next (err);
					// console.log('result', result);
					//res.json({"result" : "OK"});
					else if(result.affectedRows == 1){
						res.send('Like -1 !');
					}

					else{
						res.json({"msg" : "FAIL! You have already liked -1 this person !"});
					}

					conn.release();
				})
		})
	})
}

exports.addLike = function(req, res, next){
	var likegiver_user_num = req.body.likegiver_user_num;
	var liketaker_user_num = req.body.liketaker_user_num;

	console.log(likegiver_user_num, liketaker_user_num)
	var sql1 = "INSERT INTO profile_like (likegiver_user_num, liketaker_user_num) VALUES (?, ?)"
	var sql2 = "UPDATE user SET total_like = total_like +1 WHERE user_num = ?"
		pool.getConnection(function(err, conn){
			conn.query(sql2, [liketaker_user_num], function(err, like){
				conn.query(sql1, [likegiver_user_num, liketaker_user_num], function(err, result){
					console.log('like---', like);
					if (err)
					{
						res.json({"msg" : "FAIL! You have already liked +1 this person !"});
					}
					// return next (err);
					// console.log('result', result);
					//res.json({"result" : "OK"});
					else if(result.affectedRows == 1){
						res.send('Like +1 !');
					}

					conn.release();
				})
		})
	})
}
exports.writeReference =function(req, res, next){
	var writer_user_num = req.body.writer_user_num;
	var reader_user_num = req.body.reader_user_num;
	var comment = req.body.comment;
	var comment_date = new Date();
	console.log(req.body);

	var sql = "INSERT INTO reference (writer_user_num, reader_user_num, comment, comment_date) VALUES (?, ?, ?, ?)"
	var sql2 = "SELECT push_reg_id FROM user WHERE user_num = ?"
	var sql3 = "SELECT nickname FROM user WHERE user_num = ?"
	var data = [writer_user_num, reader_user_num, comment, comment_date];
	if(comment&&writer_user_num&&reader_user_num){
		if(comment.length > 1){
			pool.getConnection(function(err, conn){
				// conn.query(sql3, [writer_user_num], function(err, push){
				// 	conn.query(sql2, [reader_user_num], function(err, reader){
						conn.query(sql, data, function(err, result){
							if (err)
							{
								res.json({"msg" : "같은 내용을 입력할 수 없습니다!"});
							}
							// return next (err);
							// console.log('result', result);
							//res.json({"result" : "OK"});
							else if(result.affectedRows == 1){
								// var message = new gcm.Message();
								// var a = new Date();
								// var hours = a.getHours();
								// var suffix = hours >= 12 ? "PM":"AM";
								// hours = ((hours + 11) % 12 + 1)
								// var datetime = a.getMonth() + '.' + a.getDate() + ' ' + hours + ':' + a.getMinutes() + ' ' + suffix
								// var message = new gcm.Message({
								//     collapseKey: 'demo',
								//     delayWhileIdle: true,
								//     timeToLive: 3,
								//     data: {
								//         title: 'iting push msg',
								//         message: 'push test! ' + push[0].nickname + ' 님께서 후기를 남기셨습니다!',
								//				 datetime : date time
								//     }
								// });

								// var server_api_key = '****';
								// var sender = new gcm.Sender(server_api_key);
								// var registrationIds = [];
								// registrationIds.push(reader[0].push_reg_id);

								// sender.send(message, registrationIds, 4, function (err, result) {
								//     console.log(result);
								// });

								res.json({'msg' : '레퍼런스남기기 성공'});
							}
							conn.release();
					// 	});
					// })
				})
			})
		}
		else{
			res.json({'msg' : '코멘트를 입력하세요 !'})
		}
	}
	else{
		res.json({'msg' : '필수사항을 입력하세요! 키값 : writer_user_num, reader_user_num, comment'})
	}
}

exports.updateProfileUserLearn = function(req, res, next){
	var body = req.body;
	var user_learn = body.user_learn;
	var user_num = req.params.user_num;

	console.log('user_teach---', user_learn);

	var sql = "UPDATE user SET user_learn = ? WHERE user_num = ?"
	var data = [user_learn, user_num];

	pool.getConnection(function(err, conn){
		conn.query(sql, data, function(err, result){
			if (err)
			{
				res.json({"msg" : "Error!"});
			}
			// return next (err);
			// console.log('result', result);
			//res.json({"result" : "OK"});
			if(result.affectedRows == 1){
				res.json({"msg" : "OK! You updated your user_learn as " + user_learn});
			}
			conn.release();
		})
	})
}


exports.updateProfileUserTeach = function(req, res, next){
	var body = req.body;
	var user_teach = body.user_teach;
	var user_num = req.params.user_num;
	console.log('user_teach_body---', body);
	console.log('user_teach---', user_teach);

	var sql = "UPDATE user SET user_teach = ? WHERE user_num = ?"
	var data = [user_teach, user_num];

	pool.getConnection(function(err, conn){
		conn.query(sql, data, function(err, result){
			if (err)
			{
				res.json({"msg" : "Error!"});
			}
			// return next (err);
			// console.log('result', result);
			//res.json({"result" : "OK"});
			if(result.affectedRows == 1){
				res.json({"msg" : "OK! You updated your detail as " + user_teach});
			}
			conn.release();
		})
	})
}

exports.updateProfileDetail = function(req, res, next){
	var body = req.body;
	var detail = req.body.detail;
	var user_num = req.params.user_num;

	console.log('detail---', detail);

	var sql = "UPDATE user SET detail = ? WHERE user_num = ?"
	var data = [detail, user_num];

	pool.getConnection(function(err, conn){
		conn.query(sql, data, function(err, result){
			if (err)
			{
				res.json({"msg" : "You have already updated your profile !"});
			}
			// return next (err);
			// console.log('result', result);
			//res.json({"result" : "OK"});
			if(result.affectedRows == 1){
				res.json({"msg" : "OK! You updated your detail as " + detail});
			}
			conn.release();
		})
	})
}

exports.updateProfileNickname = function(req, res, next){
	// var user_num = req.params.user_num;
	// var body = req.body;
	// var location = req.body.location;
	// var nickname = req.body.nickname;
	// var name = req.body.name;
	// var user_teach = req.body.user_teach;
	// var detail = req.body.detail;
	// var pic = req.body.pic;

	var body = req.body;
	var nickname = body.nickname;
	var user_num = req.params.user_num;

	console.log('nickname---', nickname);

	var sql = "UPDATE user SET nickname = ? WHERE user_num = ?"
	var data = [nickname, user_num];

	pool.getConnection(function(err, conn){
		conn.query(sql, data, function(err, result){
			if (err)
			{
				res.statusCode = 333;
				res.json({"msg" : "FAIL! Somebody is using the nickname : " + nickname + " already!"});
			}
			// return next (err);
			// console.log('result', result);
			//res.json({"result" : "OK"});
			else if(result.affectedRows == 1){
				res.json({"msg" : "OK! You updated your nickname as " + nickname});
			}
			conn.release();
		})
	})
}

exports.uploadProfilePicture = function(req, res, next){
	var user_num = parseInt(req.params.user_num);

	if(!(fs.existsSync(uploadDir) && fs.existsSync(thumbnailDir))){
		console.error('upload, thumbnail 폴더없음!');
		process.exit();
	}

	AWS.config.region = 'ap-northeast-1';
	AWS.config.accessKeyId = 'AKIAI3PC6WCMFXFXSVEQ';
	AWS.config.secretAccessKey = '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';

	var s3 = new AWS.S3();
	console.log('href', s3.endpoint.href);
	//이미지 파일 목록
	var resources = [];

		var form = new formidable.IncomingForm();
		form.encoding = 'utf-8';
		form.uploadDir = uploadDir;
		form.multiples = true;
		form.keepExtensions = true;

		form.parse(req, function(err, fields, files){
			console.log('+++++', files);
			var title = fields.title;

			var file = files.pic;
			var fileName = file.name;
			var tempFilePath = file.path;
			var contentType = file.type;

			var thumbnailFilePath = thumbnailDir + pathUtil.sep + fileName;

			// console.log(files);

			//임시 파일에서 썸네일 생성
			easyimge.thumbnail({
				src: tempFilePath,
				dst: thumbnailFilePath,
				width:100
			}).then(function(image){
				console.log('thumbnail created :', image);
			}, function(err){
				console.error('thumbnail create Errir', err);
			});

			//파일 스트림 생성
			var readStream = fs.createReadStream(tempFilePath);

			//버킷 내 이름 생성
			var extname = pathUtil.extname(file.name);
			var now = new Date();
			var newFileName = 'iting' + now.getFullYear() + now.getMonth() + now.getDate() + now.getHours() + now.getMinutes() + now.getSeconds();

			//버킷 내 키생성
			var itemKey = 'iting/' + newFileName + extname;

			var params = {
				Bucket: 'iting',
				Key: itemKey,
				ACL: 'public-read',
				Body: readStream,
				ContentType: contentType
			};

			console.log('putObject Params :', params);

			s3.putObject(params, function(err, data){

				if(err){
					console.error('S3 PutObject Error', err);
					// throw err;
				}

				//접근 경로 -2가지
				var imageUrl = s3.endpoint.href + "iting" + '/' + itemKey;
				console.log('imageUrl : ', imageUrl);
				var imageSignedUrl = s3.getSignedUrl('getObject', {Bucket: "iting" , Key: itemKey});//뭐였지

				//썸네일 키 생성
				var thumbnailKey = 'thumbnail/' + 'thumnail_' + newFileName + extname;

				var thumbanilBody = fs.createReadStream(thumbnailFilePath);

				var thumbnailParams = {
					Bucket : 'iting',
					Key: thumbnailKey,
					ACL: 'public-read',
					Body: thumbanilBody,
					ContentType: contentType
				}

				s3.putObject(thumbnailParams, function(err, data){
					//썸네일 생성
					var thumbnailUrl = s3.endpoint.href + "iting" + '/' + thumbnailKey;
					console.log("Thumbnail URL :", thumbnailUrl);

					var info = {
						title:title,
						url: imageUrl,
						thumbnail: thumbnailUrl
					};

					resources.push(info);

					fs.unlinkSync(tempFilePath);
					fs.unlinkSync(thumbnailFilePath);

					console.log('success', 'data : ', data);
					// res.redirect('/profile/' + user_num);
						pool.getConnection(function(err, conn){
							var sql = "UPDATE user SET pic = ? WHERE user_num = ?";
							var data = [imageUrl, user_num];
							conn.query(sql, data, function(err, result){
									if (err)
									{
										res.json({"msg" : "FAIL! You have already uploaded your picture !"});
									}
									// return next (err);
									// console.log('result', result);
									//res.json({"result" : "OK"});
									else if(result.affectedRows == 1){
										res.redirect('/profile/' + user_num + '/' + user_num);
									}
									//res.redirect('/list');
									conn.release();
						});
					});

				});//썸네일 파일 생성
			});//파일 생성
		});//form.parse
	};//app.post

	// app.get('/', function(req, res) {

	// 	var body = '<html><body>';
	// 			body += '<h3>File List</h3>';
	// 			body += '<ul>';

	// 			for ( var i = 0 ; i < resources.length ; i++ ) {
	// 				var item = resources[i];
	// 				body += '<li>' + '<img src="' + item.thumbnail + '">' +
	// 				item.title + '</li>';
	// 			}

	// 			body += '</ul>';
	// 			body += '<form method="post" action="/" enctype="multipart/form-data">';
	// 			body += '<input type="text" name="title"><li>';
	// 			body += '<input type="file" name="file"><li>';
	// 			body += '<input type="submit" value="Uplaod"><li>';
	// 			body += '</form>';

	// 	res.send(body);
// }

exports.addProfile = function(req, res, next){
	var body = req.body;
	var location = req.body.location;
	var nickname = req.body.name;
	var name = req.body.name;
	var user_teach = req.body.user_teach;
	var detail = req.body.detail;
	var join_date = new Date();

	var sql = "INSERT INTO user (location, nickname, name, user_teach, detail, pic, join_date) VALUES(?, ?, ?, ?, ?, ?)"
	var data = [location, nickname, name, user_teach, detail, join_date]

	pool.getConnection(function(err, conn){
		conn.query(sql, data, function(err, result){
			if (err)
			{
				res.json({"msg" : "FAIL! You have already uploaded your profile !"});
			}
			// return next (err);
			// console.log('result', result);
			//res.json({"result" : "OK"});
			else if(result.affectedRows == 1){
				res.send('프로필 추가!');
			}
			conn.release();
		})
	})
}
// 쿼리 수청 필요할듯?
// add 라이크 사용자 정보
exports.showProfile = function(req, res, next){
		var my_user_num = req.params.my_user_num;
		var other_user_num = req.params.other_user_num;
		var sql = "SELECT * FROM user WHERE user_num = ?"
		var sql2 = "SELECT a.writer_user_num, b.nickname, b.pic, a.comment, a.comment_date FROM reference a, user b WHERE a.reader_user_num = ? AND a.writer_user_num = b.user_num ORDER BY comment_date DESC"
		var sql3 = "SELECT * FROM profile_like WHERE likegiver_user_num = ? AND liketaker_user_num = ?"
		var sql4 = "SELECT * FROM friend WHERE my_user_num = ? AND friend_user_num = ?"
		var alreadylike = false;
		var alreadyfriend = false;
		pool.getConnection(function(err, conn){
			conn.query(sql, [other_user_num], function(err, result){
				conn.query(sql2, [other_user_num], function(err, reference){
						conn.query(sql3, [my_user_num, other_user_num], function(err, like){
							conn.query(sql4, [my_user_num, other_user_num], function(err, friend){
						console.log('like : ', like);
						// console.log('reference---', reference)
						if(result[0].user_num == my_user_num){
							alreadyfriend = true;
						}
						if(like[0]){
							alreadylike = true;
						}
						console.log('result : ', friend);
						if(friend[0]){
							alreadyfriend = true;
						}
						if(result[0]){
							result[0]['alreadylike'] = alreadylike;
							result[0]['alreadyfriend'] = alreadyfriend;
						}
						for(var i = 0; i<reference.length; i++) {
							var temp = reference[i].comment_date;
							reference[i].t_comment_date = moment(temp).fromNow();
						}
						res.json({profile : result, reference : reference});
						conn.release();
					})
				})
			});
		})
	})
}

// 레퍼런스만 따로 출력했던 로직
// exports.showReference = function(req, res, next){
// 		var user_num = req.params.user_num;
// 		var sql = "SELECT * FROM reference WHERE reader_user_num = ?"
// 		pool.getConnection(function(req, conn){
// 			conn.query(sql, [user_num], function(err, result){
// 				res.json({reference : result});
// 				conn.release();
// 		})
// 	})
// }

exports.deleteReceivedMeetingList = function(req, res, next){
		var my_user_num = req.body.my_user_num;
		var other_user_num = req.body.other_user_num
		var num = req.body.num;
		var sql = "DELETE FROM meeting WHERE requestee_user_num = ? AND requestor_user_num = ? AND num = ?"

		pool.getConnection(function(err, conn){
			conn.query(sql, [my_user_num, other_user_num, num], function(err, result){
					if (err)
					{
						res.json({"msg" : "FAIL! The number = " + num + ", does not exist in your MeetingList !"});
					}
					// return next (err);
					// console.log('result', result);
					//res.json({"result" : "OK"});
					else if(result.affectedRows == 1){
						res.json({result : "meeting request was deleted"})
					}

					else if(result.affectedRows == 0){
						res.statusCode = 314
						res.json({"result" : "You don't have request from user " + other_user_num + ", for your posting number = " + num});
					}
					//res.redirect('/list');
					conn.release();
			});
		})
	}

exports.deleteSentMeetingList = function(req, res, next){
		var my_user_num = req.body.my_user_num;
		var other_user_num = req.body.other_user_num
		var num = req.body.num;
		var sql = "DELETE FROM meeting WHERE requestor_user_num = ? AND requestee_user_num = ? AND num = ?"

		pool.getConnection(function(err, conn){
			conn.query(sql, [my_user_num, other_user_num, num], function(err, result){
					if (err)
					{
						res.json({"msg" : "FAIL! The number = " + num + ", does not exist in your MeetingList !"});
					}
					// return next (err);
					// console.log('result', result);
					//res.json({"result" : "OK"});
					else if(result.affectedRows == 1){
						res.json({result : "meeting request was deleted"})
					}

					else if(result.affectedRows == 0){
						res.statusCode = 313
						res.json({"result" : "You don't have request to user " + other_user_num + ", for his/her posting number = " + num});
					}
					//res.redirect('/list');
					conn.release();
			});
		})
	}

exports.addMeetingList = function(req, res, next){
		var my_user_num = req.body.my_user_num;
		var other_user_num = req.body.other_user_num;
		var num = req.body.num;
		var request_date = new Date();
		console.log(num);
		var sql = "INSERT INTO meeting (requestor_user_num, requestee_user_num, num, request_date) VALUES(?, ?, ?, ?)"
		var sql2 = "SELECT push_reg_id FROM user WHERE user_num = ?"
		if(my_user_num != other_user_num){
			pool.getConnection(function(err, conn){
				// conn.query(sql2, [other_user_num], function(err, push){
						conn.query(sql, [my_user_num, other_user_num, num, request_date], function(err, result){
							if (err)
							{
								console.log(err)
								if(err.errno == 1062){
								res.statusCode = 311;
								res.json({"msg" : "FAIL! The number = " + num + ", already exists in your MeetingList !"});
							}
								else if(err.errno = 1452){
									res.statusCode = 312
									res.json({"msg" : "FAIL! The number = " + num + ", has been delete from the board !"})
								}
							}
							// return next (err);
							// console.log('result', result);
							//res.json({"result" : "OK"});
							else if(result.affectedRows == 1){
								res.json({"msg" : "OK! You have requested a meeting to the number " + num})
								// var message = new gcm.Message();
								// var a = new Date();
								// var hours = a.getHours();
								// var suffix = hours >= 12 ? "PM":"AM";
								// hours = ((hours + 11) % 12 + 1)
								// var datetime = a.getMonth() + '.' + a.getDate() + ' ' + hours + ':' + a.getMinutes() + ' ' + suffix
								// var message = new gcm.Message({
								//     collapseKey: 'demo',
								//     delayWhileIdle: true,
								//     timeToLive: 3,
								//     data: {
								//         title: 'iting push msg',
								//         message: 'push test! ' + push[0].nickname + ' 님께서 재능교환 신청하셨습니다!',
								//				 datetime : datetime
								//     }
								// });

								// var server_api_key = '****';
								// var sender = new gcm.Sender(server_api_key);
								// var registrationIds = [];
								// registrationIds.push(push[0].push_reg_id);

								// sender.send(message, registrationIds, 4, function (err, result) {
								//     console.log(result);
								// });
							}
							else if(result.affectedRows == 0){
								res.json({"msg" : "the posting does not exist anymore !"})
							}
							conn.release();
						// })
					})
				})
			}
		else{
			res.json({"msg" : "FAIL! You can not send a request to yourself!"})
		}
}
// 신청을 보낸것 & 신청을 받은것 두개의 SELECT 문을 합쳐서 JSON 으로 보내는 방법은? 해결 완료!!
// 글의 user_num 와 로그인 user_num 가 같을 시에는 그 글은 신청을 받은 글 !


exports.rejectRequest = function(req, res, next){
	var my_user_num = req.body.my_user_num;
	var other_user_num = req.body.other_user_num;
	var num = req.body.num;
	var sql = "UPDATE meeting SET meeting_status = 2 WHERE requestee_user_num = ? AND requestor_user_num = ? AND num = ?"

	pool.getConnection(function(err, conn){
		conn.query(sql, [my_user_num, other_user_num, num], function(err, result){
			if(err){
				res.json({"msg" : "FAIL!"})
			}

			else if(result.affectedRows ==1 ){
				res.json({"msg" : "You have rejected a request!"})
			}
			conn.release();
		})
	})
}

exports.acceptRequest = function(req, res, next){
	var my_user_num = req.body.my_user_num;
	var other_user_num = req.body.other_user_num;
	var num = req.body.num;
	var sql = "SELECT meeting_status FROM meeting WHERE requestee_user_num = ? AND requestor_user_num = ? AND num = ?"
	var sql1 = "UPDATE meeting SET meeting_status = 2 WHERE requestee_user_num = ? AND num = ?"
	var sql2 = "UPDATE meeting SET meeting_status = 1 WHERE requestee_user_num = ? AND requestor_user_num = ? AND num = ?"
	var sql3 = "UPDATE user, meeting SET user.meeting = meeting+1 WHERE (requestee_user_num = ? AND requestor_user_num = ? AND num = ?) AND (user.user_num = requestor_user_num OR user.user_num = requestee_user_num)"
	var sql4 = "SELECT push_reg_id FROM user WHERE user_num = ?"
	var sql5 = "SELECT nickname FROM user WHERE user_num = ?"


	pool.getConnection(function(err, conn){
			conn.query(sql, [my_user_num, other_user_num, num], function(err, meeting_status_check){
				console.log(meeting_status_check);
				if(meeting_status_check.length > 0){
					if(meeting_status_check[0].meeting_status == 1){
						res.json({"msg" : "FAIL! You have already accepted a request from user : " + other_user_num + ", for your posting num : " + num})
					}
					else{
						// conn.query(sql5, [my_user_num], function(err, nickname){
							// conn.query(sql4, [other_user_num], function(err, push){
								conn.query(sql1, [my_user_num, num], function(err, result){
									conn.query(sql2,[my_user_num, other_user_num, num], function(err, meeting_status){
										conn.query(sql3, [my_user_num, other_user_num, num], function(err, user_meeting){
											if(err){
												res.json({"msg" : "FAIL!"})
											}
											else if(meeting_status.affectedRows == 1 ){
												// var message = new gcm.Message();
												// var a = new Date();
												// var hours = a.getHours();
												// var suffix = hours >= 12 ? "PM":"AM";
												// hours = ((hours + 11) % 12 + 1)
												// var datetime = a.getMonth() + '.' + a.getDate() + ' ' + hours + ':' + a.getMinutes() + ' ' + suffix
												// var message = new gcm.Message({
												//     collapseKey: 'demo',
												//     delayWhileIdle: true,
												//     timeToLive: 3,
												//     data: {
												//         title: 'iting push msg',
												//         message: 'push test! ' + nickname[0].nickname + ' 님께서 재능교환 수락!',
												//  		 	 datetime : datetime
												//     }
												// });

												// var server_api_key = '****';
												// var sender = new gcm.Sender(server_api_key);
												// var registrationIds = [];
												// registrationIds.push(push[0].push_reg_id);

												// sender.send(message, registrationIds, 4, function (err, result) {
												//     console.log(result);
												// });
												res.json({"msg" : "You have accepted a request!"})
										}
								// 	})
								// })
							})
						})
					})
				}
			}
			else{
				res.statusCode = 315;
				res.json({"msg" : "The request has been deleted from the requestor !"})
			}
		})
conn.release();
	})
}

exports.showMeetingListRequestIn = function(req, res, next){
	var my_user_num = req.body.user_num;
	// var sql = "SELECT DISTINCT a.num, a.user_num, a.content, a.board_learn, a.location, a.hit, a.regdate, b.pic, b.nickname FROM board a, user b, meeting c WHERE (c.requestee_user_num = ? AND a.num = c.num AND a.user_num = b.user_num) ORDER BY c.request_date desc"
	var sql = "SELECT a.num, a.user_num, a.content, a.board_teach, a.board_learn, a.location, a.hit, a.regdate, a.t_regdate, b.pic, b.nickname FROM board a, user b WHERE a.user_num = ? AND a.user_num = b.user_num ORDER BY a.num desc"
	var sql2 = "SELECT a.meeting_status, a.num, b.user_num, b.nickname, b.user_teach, b.pic, a.request_date FROM meeting a, user b WHERE a.requestee_user_num = ? AND a.requestor_user_num = b.user_num"
	pool.getConnection(function(err, conn){
		conn.query(sql, [my_user_num], function(err, rows){
				conn.query(sql2, [my_user_num], function(err, users){
				var listuser = rows;
				for(var i = 0; i<listuser.length; i++){
					var temp = listuser[i].regdate
					listuser[i].t_regdate = moment(temp).fromNow();
					listuser[i]['requestors'] = [];
				}
				console.log('user 0번쨰', users[0]);
				// console.log('adfadf',listuser[0].requestors)
				// listuser[0].requestors.push(users[i]);
				for(var i = 0; i<listuser.length; i++){
					for(var j = 0; j<users.length; j++){
						if(users[j].num == listuser[i].num){
							 var temp2 = users[j].request_date
							 listuser[i].requestors.push(users[j]);
							 users[j]['t_request_date'] = moment(temp2).fromNow();
						}
					}
				}
				// for(var i = 0; i<listuser.length; i++) {
				// 	var temp = listuser[i].regdate;
				// 	var temp2 = listuser[i].request_date
				// 	listuser[i].t_regdate = moment(temp).fromNow();
				// 	listuser[i].t_request_date = moment(temp2).fromNow();
				// }
				res.json({list : listuser});
				conn.release();
			})
		})
	})
}

exports.showMeetingListRequestOut = function(req, res, next){
	var my_user_num = req.body.user_num;
	var sql2 = "SELECT pic, nickname FROM user WHERE user_num = ?"
	var sql = "SELECT a.num, a.user_num, a.content, a.board_teach, a.board_learn, a.location, a.hit, a.regdate, a.t_regdate, b.nickname, b.pic, c.request_date, c.t_request_date, c.requestor_user_num, c.meeting_status FROM board a, user b, meeting c WHERE (c.requestor_user_num = ? AND c.requestee_user_num = b.user_num AND a.num = c.num) ORDER BY c.request_date desc"
	pool.getConnection(function(err, conn){
		conn.query(sql2, [my_user_num], function(err, result){
			conn.query(sql, [my_user_num], function(err, rows){
				console.log("result : ", rows)
				for(var i = 0; i<rows.length; i++) {
					var temp = rows[i].regdate;
					var temp2 = rows[i].request_date
					rows[i].t_regdate = moment(temp).fromNow();
					rows[i].t_request_date = moment(temp2).fromNow();
					rows[i]['my_nickname'] = result[0].nickname;
					rows[i]['my_pic'] = result[0].pic
				}
				res.json({list : rows});
				conn.release();
			})
		})
	})
}

exports.showMeetingList = function(req, res, next){
	var my_user_num = req.params.user_num;
	var sql = "SELECT a.num, a.user_num, a.content, a.board_teach, a.board_learn, a.location, a.hit, a.regdate, a.t_regdate, b.nickname, b.pic, c.request_date, c.t_request_date, c.requestor_user_num FROM board a, user b, meeting c WHERE (c.requestor_user_num = ? AND c.requestee_user_num = b.user_num AND a.num = c.num) OR (c.requestee_user_num = ? AND c.requestor_user_num = b.user_num AND a.num = c.num) ORDER BY c.request_date desc"
	pool.getConnection(function(err, conn){
		conn.query(sql, [my_user_num, my_user_num], function(err, rows){
			console.log("result : ", rows)
			for(var i = 0; i<rows.length; i++) {
				var temp = rows[i].regdate;
				var temp2 = rows[i].request_date
				rows[i].t_regdate = moment(temp).fromNow();
				rows[i].t_request_date = moment(temp2).fromNow();
			}
			res.json({list : rows});
			conn.release();
		})
	})
}

exports.deleteFriend = function(req, res, next){
		// var my_user_num = req.params.user_num;
		// var friend_user_num = req.params.friend_user_num;
		var my_user_num = req.body.my_user_num
		var friend_user_num = req.body.friend_user_num;
		var body = req.body;
		console.log("body-----", body);

		var sql = "DELETE FROM friend WHERE my_user_num = ? AND friend_user_num = ?"

		pool.getConnection(function(err, conn){
			conn.query(sql, [my_user_num, friend_user_num], function(err, result){
				if (err)
				{
					res.json({"msg" : "FAIL! You have an error !"})
				}
				// return next (err);
				// console.log('result', result);
				else if (result.affectedRows == 1)
				{
					res.json({result : "OK! The number = " + friend_user_num + ", has been delete from your FriendList !"});
				}

				else
				{
					res.json({"msg" : "FAIL! Your user number is = " + my_user_num + " And your friend number = " + friend_user_num + ", does not exist in your FriendList !"})
				}

				conn.release();
		})
	})
}

exports.addFriend = function(req, res, next){
	var my_user_num = req.body.my_user_num;
	var friend_user_num = req.body.friend_user_num;
	var friended_date = new Date();
	var sql = "INSERT INTO friend (my_user_num, friend_user_num, friended_date) VALUES(?, ?, ?)"
	var sql2 = "SELECT user_push_key FROM user WHERE user_num = ?"
	var sql3 = "SELECT nickname FROM user WHERE user_num = ?"

	if(my_user_num != friend_user_num){
		pool.getConnection(function(err, conn){
		// conn.query(sql3, [my_user_num], function(err, friend){
		// 	conn.query(sql2, [friend_user_num], function(err, push){
				conn.query(sql, [my_user_num, friend_user_num, friended_date], function(err, result){
						if (err)
						{
							res.json({"msg" : "FAIL! The number = " + friend_user_num + ", already exists in your FriendList ! OR the user number = " + friend_user_num + " does not exist! "})
						}
						// return next (err);
						// console.log('result', result);
						//res.json({"result" : "OK"});
						else if(result.affectedRows == 1)
						{
							// var message = new gcm.Message();
							// var a = new Date();
							// var hours = a.getHours();
							// var suffix = hours >= 12 ? "PM":"AM";
							// hours = ((hours + 11) % 12 + 1)
							// var datetime = a.getMonth() + '.' + a.getDate() + ' ' + hours + ':' + a.getMinutes() + ' ' + suffix
							// var message = new gcm.Message({
							//     collapseKey: 'demo',
							//     delayWhileIdle: true,
							//     timeToLive: 3,
							//     data: {
							//         title: 'iting push msg',
							//         message: 'push test! ' + friend[0].nickname + ' 님께서 회원님을 친구추가하였습니다!',
							//  		 	 	datetime : datetime
							//     }
							// });

							// var server_api_key = '****';
							// var sender = new gcm.Sender(server_api_key);
							// var registrationIds = [];
							// registrationIds.push(push[0].push_reg_id);

							// sender.send(message, registrationIds, 4, function (err, result) {
							//     console.log(result);
							// });
							res.json({"msg" : "OK! The number = " + friend_user_num + ", has been added to your FriendList !"});
						}
						//res.redirect('/list');
						conn.release();
				// 	})
				// })
			})
		})
	}
	else
		res.json({'fail msg' : '자신을 친구로 등록할 수 없습니다.'})
}

exports.showFriendList = function(req, res, next){
		var user_num = req.params.user_num;
		console.log('user_num = ', user_num);

		var sql = "SELECT a.user_num, a.nickname, a.pic from user a, friend b WHERE b.my_user_num = ? AND a.user_num = b.friend_user_num ORDER BY a.nickname asc" ;

		pool.getConnection(function(err, conn){
		conn.query(sql, [user_num], function(err, rows){
			console.log("result : ", rows)

			res.json({list : rows});
			conn.release();
		})
	})
}

exports.deleteBookmark = function(req, res, next){
		var user_num = req.body.user_num;
		var num = req.body.num;
		var sql = "DELETE FROM bookmark WHERE user_num = ? AND num = ?"

		pool.getConnection(function(err, conn){
			conn.query(sql, [user_num, num], function(err, result){
				if (err)
				{
					res.json({"msg" : "You have an error !"})
				}
				// return next (err);
				// console.log('result', result);
				else if(result.affectedRows == 0)
				{
					res.json({"msg" : "FAIL! The number = " + num + ", does not exist in your BookmarkList !"})
				}
				else if(result.affectedRows == 1)
				{
					res.json({"msg" : "OK! The number = " + num + ", has been deleted from your BookmarkList !"});
				}
				conn.release();
		})
	})
}

exports.addBookmark = function(req, res, next){
		var user_num = req.body.user_num;
		var num = req.body.num;
		var bookmark_date = new Date();
		console.log('bookmark_date--', bookmark_date);

		var sql = "INSERT INTO bookmark (user_num, num, bookmark_date) VALUES(?, ?, ?)"

		pool.getConnection(function(err, conn){
		conn.query(sql, [user_num, num, bookmark_date], function(err, result){
			// console.log(result)
			console.log(err)
			if (err)
			{
				if(err.errno == 1452){
					res.statusCode = 321;
					console.log('The posting you tried adding on your bookmark list has been deleted from the board!')
					res.json({"msg" : "FAIL! The number = " + num + ", has been deleted from the board!"})
				}

				if(err.errno == 1062){
					res.statusCode = 322;
					res.json({"msg" : "FAIL! The number = " + num + ", already exists in your BookmarkList ! OR The num = " + num + " does not exist in boardlist anymore !"})
					}
			}
			// return next (err);
			// console.log('result', result);
			//res.json({"result" : "OK"});
			else if(result.affectedRows == 1)
			{
				res.json({"msg" : "OK! The number = " + num + ", has been added to your BookmarkList !"});
			}
			//res.redirect('/list');
			conn.release();
		})
	})
}

exports.showBookmarkList = function(req, res, next){
		var user_num = req.params.user_num;
		console.log('user_num = ', user_num);

		var sql = "SELECT a.num, a.user_num, a.content, a.board_teach, a.board_learn, a.location, a.hit, a.regdate, a.t_regdate, b.nickname, b.pic, c.bookmark_date, c.t_bookmark_date FROM board a, user b, bookmark c WHERE a.user_num = b.user_num AND c.user_num = ? AND a.num = c.num ORDER BY num desc" ;

		pool.getConnection(function(err, conn){
		conn.query(sql, [user_num], function(err, rows){
			for(var i = 0; i<rows.length; i++) {
				var temp = rows[i].regdate;
				var temp2 = rows[i].bookmark_date;
				rows[i].t_regdate = moment(temp).fromNow();
				rows[i].t_bookmark_date = moment(temp2).fromNow();
			}

			res.json({list : rows});
			conn.release();
		})
	})
}

exports.searchPosting = function(req, res, next){
	var location = req.query.location;
	// var content = req.body.content;
	// var board_learn = req.body.board_learn;
	// var user_teach = req.body.user_teach;
	// var nickname = req.body.nickname;
	var search = req.query.search;

	if(search){
		var temp = new Array();
		temp = search.split(" ");
		if(temp.length > 1){
			search = temp;
		}
	}

	var arraysql = "SELECT a.num, a.user_num, a.content, a.board_teach, a.board_learn, a.location, a.hit, a.regdate, b.nickname, b.pic FROM board a, user b WHERE ("
	var data = [];
	console.log('search = ', search);
	console.log('location = ',location);
	// console.log('user teach = ', user_teach)
// for in 문을 이용해서, 검색 쿼리 수정하기
	if (search instanceof Array){
		for(var i = 0; i < search.length; i++){
			if( (i+1) == search.length)
			{
				arraysql += "(a.content LIKE ? OR a.board_learn LIKE ? OR a.board_teach LIKE ?))"
			}
			else
			{
				arraysql += "(a.content LIKE ? OR a.board_learn LIKE ? OR a.board_teach LIKE ?) OR "
			}
			for(var j = 0; j < 3; j++)
			{
				data.push('%' + search[i] + '%')
			}
		}
	}

	else{
		arraysql += "(a.content LIKE ? OR a.board_learn LIKE ? OR a.board_teach LIKE ?))"
		for(var j = 0; j < 3; j++){
			data.push('%' + search + '%')
		}
	}
	// arraysql += " AND a.user_num = b.user_num ORDER BY a.num desc"

	pool.getConnection(function(err, conn){

			if(search&&location){
				// var sql = "SELECT a.num, a.user_num, a.content, a.board_learn, a.location, a.hit, a.regdate, b.nickname, b.user_teach, b.pic FROM board a, user b WHERE (a.content LIKE ? OR a.board_learn LIKE ? OR b.user_teach LIKE ?) AND a.location LIKE ? AND a.user_num = b.user_num ORDER BY a.num desc"
				arraysql += " AND a.location LIKE ? AND a.user_num = b.user_num ORDER BY a.num desc"
				data.push('%' + location + '%');
				console.log('array --- ', arraysql);
				console.log('data --- ', data);
				conn.query(arraysql, data, function(err, rows){
					if (err)
					{
						res.json({"msg" : "검색결과가 없습니다 !"});
					}
					else
					{
						for(var i = 0; i<rows.length; i++) {
							var temp = rows[i].regdate;
							rows[i].t_regdate = moment(temp).fromNow();
						}
						res.json({list : rows});
					}
				})
			}

			else if(search){
				// var sql = "SELECT a.num, a.user_num, a.content, a.board_learn, a.location, a.hit, a.regdate, b.nickname, b.user_teach, b.pic FROM board a, user b WHERE (a.content LIKE ? OR a.board_learn LIKE ? OR b.user_teach LIKE ?) AND a.user_num = b.user_num ORDER BY a.num desc"
				arraysql += " AND a.user_num = b.user_num ORDER BY a.num desc"
				conn.query(arraysql, data, function(err, rows){
					if (err)
					{
						res.json({"msg" : "검색결과가 없습니다 !"});
					}
					else
					{
						for(var i = 0; i<rows.length; i++) {
							var temp = rows[i].regdate;
							rows[i].t_regdate = moment(temp).fromNow();
						}
						res.json({list : rows});
					}
				})
			}
			// else{
			// 	res.json({result : "검색어를 입력하세요 !"});
			// }

			else if(location){
				var sql = "SELECT a.num, a.user_num, a.content, a.board_teach, a.board_learn, a.location, a.hit, a.regdate, b.nickname, b.pic FROM board a, user b WHERE a.location LIKE ? AND a.user_num = b.user_num ORDER BY a.num desc"

				conn.query(sql, ['%' + location + '%'], function(err, rows){
					if (err)
					{
						res.json({"msg" : "검색결과가 없습니다 !"});
					}
					else
					{
						for(var i = 0; i<rows.length; i++) {
							var temp = rows[i].regdate;
							rows[i].t_regdate = moment(temp).fromNow();
						}
						res.json({list : rows});
					}
				})
			}

			else{
				res.json({result : "검색어를 입력하세요 !"});
			}
		conn.release();
	})
}

exports.deletePosting = function(req, res, next){
	var user_num = req.body.user_num;
	var num = req.body.num;
	var sql = "DELETE FROM board WHERE num = ?"

	pool.getConnection(function(err, conn){
		conn.query(sql, [num], function(err, result){
				if (err)
				{
					res.json({"msg" : "FAIL! The number = " + num + ", does not exist in the boardList!"})
				}
				// return next (err);
				// console.log('result', result);
				//res.json({"result" : "OK"});
				else if(result.affectedRows == 1){
					res.redirect('/board'); // 문자열이기 때문에 ('/list/' + page ) 형식으로 쓸것.
				}
				//res.redirect('/list');
				conn.release();
		});
	})
}

exports.updatePosting = function(req, res, next){
	console.log(req.body);
	var user_num = req.body.user_num;
	var num = req.body.num;

	var location = req.body.location;
	var content = req.body.content;
	var board_learn = req.body.board_learn;
	var board_teach = req.body.board_teach;

	pool.getConnection(function(err, conn){
			var sql = "UPDATE board SET location = ?, content = ?, board_teach = ?, board_learn = ? WHERE num = ?"
			var data = [location, content, board_teach, board_learn, num];

			pool.getConnection(function(err, conn){

				conn.query(sql, data, function(err, result){
					console.log('reuslt ----', result);
					if (err)
					{
						res.json({"msg" : "FAIL! You have already updated this post, The number = " + num });
					}
					// return next (err);
					// console.log('result', result);777
					//res.json({"result" : "OK"});
					else if(result.affectedRows == 0){
						res.json({"msg" : "Sorry, you failed to update your posting!"})
					}
					else if(content.length < 20){
						res.json({"msg" : "(20자 이상)You have to write more than 20 letters !"})
					}
					else if(result.affectedRows == 1){
						res.redirect('/board/' + user_num +'/' + num);
					}
					//res.redirect('/list');
					conn.release();
				})
		})
	})
}

exports.writePosting = function(req, res, next){
		var body = req.body;
		var query =req.query;


		 console.log('req.body is = ', body);
		 console.log('req.query is = ', query);
		// res.send('req-body is', body);

		var user_num = req.body.user_num;
		var location = req.body.location;
		var content = req.body.content;
		var board_teach = req.body.board_teach;
		var board_learn = req.body.board_learn;
		var regdate = new Date();
		console.log(regdate);

		pool.getConnection(function(err, conn){
			var sql = "INSERT INTO board (user_num, location, content, board_teach, board_learn, regdate) VALUES (?, ?, ?, ?, ?, ?)";
			var data = [user_num, location, content, board_teach, board_learn, regdate];
			if(content.length < 20){
						res.json({msg : "(20자 이상)You have to write more than 20 letters !"});
					}
			else{
				conn.query(sql, data, function(err, result){
						if (err)
						{
							res.json({msg : "You have to write in content or must be logged in !"});
						}
						// return next (err);
						// console.log('result', result);
						//res.json({"result" : "OK"});
						else if(result.affectedRows == 1){
							res.redirect('/board');
						}
						//res.redirect('/list');
						conn.release();
				});
			}
	});
};

exports.readPosting = function(req, res, next){
		var user_num = req.params.user_num;
    var num = req.params.num;
    console.log('num = ', num);
		var sql = "SELECT a.num, a.user_num, a.content, a.board_teach, a.board_learn, a.location, a.hit, a.regdate, a.t_regdate, b.nickname, b.pic, b.push_reg_id FROM board a, user b WHERE a.num = ? AND a.user_num = b.user_num";
		var sql2 = "SELECT num FROM bookmark WHERE user_num = ?"
		// var sql2 = "SELECT num FROM bookmark WHERE user_num = ? WHERE EXISTS (SELECT * FROM board WHERE board.num = bookmark.num)"
		var sql3 = "SELECT num FROM meeting WHERE requestor_user_num = ?"
		var sql4 = "SELECT friend_user_num FROM friend WHERE my_user_num = ?"
		var sql5 = "SELECT num FROM meeting WHERE num = ? LIMIT 1"
		var alreadyBookmark = false;
		var alreadyrequest = false;
		var alreadyfriend = false;
		var updateAvailable = true;

		pool.getConnection(function(err, conn){
			conn.query("UPDATE board SET hit = hit +1 WHERE num = ?", [num], function(err, result){
				conn.query(sql, [num], function(err, posting){
					conn.query(sql2, [user_num], function(err, bookmark){
						conn.query(sql3, [user_num], function(err, request){
							conn.query(sql4, [user_num], function(err, friend){
								conn.query(sql5,[num], function(err, update){
								console.log('hit result : ', result);
								console.log('bookmark---', bookmark);
								if(update.length>0){
									updateAvailable = false;
								}

								if(err){
									res.json({msg : "FAIL! The posting does not exist anymore!"})
								}

								if(result.affectedRows == 0){
									res.json({msg : "FAIL! The posting does not exist anymore!"})
								}

								else{
									if(posting[0].user_num == user_num){
										alreadyfriend = true;
									}
									if(num&&posting[0])
									{
										for(var i in bookmark){
											if(bookmark[i].num == num){
												alreadyBookmark = true;
												break;
											}
										}
										for(var i in request){
											if(request[i].num == num){
												alreadyrequest = true;
												break;
											}
										}

										for(var i in friend){
											if(friend[i].friend_user_num == posting[0].user_num){
												alreadyfriend = true;
												break;
											}
										}
										var temp = posting[0].regdate;
										posting[0].t_regdate = moment(temp).fromNow();
										posting[0]['alreadyBookmark'] = alreadyBookmark;
										posting[0]['alreadyrequest'] = alreadyrequest;
										posting[0]['alreadyfriend'] = alreadyfriend;
										posting[0]['updateAvailable'] = updateAvailable;
									}
									res.json({posting : posting});
								}
								conn.release();
							})
						})
					})
				})
			})
		})
	})
}

exports.showList = function(req, res, next){
		var sql = "SELECT a.num, a.user_num, a.content, a.board_teach, a.board_learn, a.location, a.hit, a.regdate, a.t_regdate, b.nickname, b.pic FROM board a, user b WHERE a.user_num = b.user_num ORDER BY num desc";
		pool.getConnection(function(err, conn){
		conn.query(sql, [], function(err, data){
			for(var i = 0; i<data.length; i++) {
				var temp = data[i].regdate;
				data[i].t_regdate = moment(temp).fromNow();
			}
			res.json({list : data});
			conn.release();
		})
	})
};
