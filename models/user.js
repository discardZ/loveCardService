var db = require('./db.js');

function User(user) {
    this.name = user.name;  //用户名
    this.password = user.password;  // 密码
    this.email = user.email;   //邮箱
    this.description = user.description; //描述
    this.location = user.location;   //地区
    this.picAddress = user.picAddress; //头像图片地址
    this.loverName = user.loverName;  //爱人名称
    this.loverId = user.loverId;  //爱人ID
    this.age = user.age;//年龄
};

module.exports = User;


var insertUserSql = 'insert into card_user (name,password,email,description,picAddress,sex,age,loction,lover_id,lover_name) value()'
var selectUserById = 'select * from card_user where id = ?';
/**
 * 插入用户
 * @param callback
 */
User.prototype.save = function (callback) {//存储用户信息
    //要存入数据库的用户文档
    var user = this;
//    db.query();
};

/**
 * 根据id获得用户
 * @param id
 * @param callback
 */
User.getUserById = function (id, callback) {//读取用户信息
    db.getConnection(function(err,con){
        if(err){
            return callback(err,null);
        }
        con.query(selectUserById,[id],function(err,user){
            callback(err,user);
        });
    });
};

/**
 * 用户是否存在
 * @param name
 * @param password
 * @param callback
 */
User.isExist = function (name, password, callback) {//读取用户信息
    //打开数据库
    mongodb.open(function (err, db) {
        if (err) {
            mongodb.close();
            return callback(err);
        }
        //读取 users 集合
        db.collection('users', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.findOne({
                name: name, password: password
            }, function (err, doc) {
                mongodb.close();
                if (doc) {
                    var user = new User(doc);
                    callback(err, user);//成功！返回查询的用户信息
                } else {
                    callback(err, null);//失败！返回null
                }
            });
        });
    });
};

/**
 * 获得所有用户
 * @param index
 * @param pageSize
 * @param callback
 */
User.getAllUsers = function (index,pageSize,callback){
    mongodb.open(function (err, db) {
        if (err) {
            mongodb.close();
            return callback(err);
        }
        db.collection('users', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.count(function(err,count){
                if (err) {
                    mongodb.close();
                    return callback(err);
                }
                var pageList = new PageList(pageSize,index,count,null);
                collection.find().sort({time: -1}).limit(pageSize).skip(pageList.getStartItem()).toArray(function (err, posts) {
                    mongodb.close();
                    if (err) {
                        callback(err);//失败！返回 err
                    }
                    if(null == posts){
                        posts = [];
                    }
                    pageList.valueList = posts;
                    callback(null, pageList);
                });
            });

        });
    });
};

/**
 * 获得所有关注用户
 * @param name
 * @param callback
 */
User.getAllFollowUsers = function (name, callback) {
    mongodb.open(function (err, db) {
        if (err) {
            mongodb.close();
            return callback(err);
        }
        db.collection('users', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.findOne({name:name},{friends:true,_id:false},function(err,docs){
                mongodb.close();
                console.log(1);
                if(docs.friends == null){
                    docs.friends = [];
                }
                docs.friends.push(name);
                callback(err,docs) ;
            });
        });
    });
};

/**
 * 关注用户 同时被关注用户插入粉丝 (暂不使用事务 关注和粉丝 对数据一致性要求较低 关键是mongodb分段提交实现事务太TM麻烦了)
 * @param folowUserName
 * @param userName
 * @param callback
 */
User.followUser = function(folowUserName,userName,callback){
    mongodb.open(function (err, db) {
        if (err) {
            mongodb.close();
            return callback(err);
        }
        db.collection('users', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //使用addToSet保证关注用户不重复
            collection.update({name:userName},{$addToSet:{friends:folowUserName}},function(err,docs){
                if(!err){
                    db.collection('users', function (err, collection) {
                        collection.update({name:folowUserName},{$addToSet:{fans:userName}},function(err2,docs2){
                            mongodb.close();
                            if(err2){
                                console.log(err2);
                            }
                            callback(err2,docs2);
                        });
                    });
                }else{
                    callback(err,docs);
                }
            });
        });
    });
}

/**
 * 取消关注用户 同时被关注用户删除粉丝
 * @param folowUserName 取消关注name
 * @param userName  用户
 * @param callback
 */
User.unFollowUser = function(folowUserName,userName,callback){
    mongodb.open(function (err, db) {
        if (err) {
            mongodb.close();
            return callback(err);
        }
        db.collection('users', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            //使用addToSet保证关注用户不重复
            collection.update({name:userName},{$pull:{friends:folowUserName}},function(err,docs){
                if(!err){
                    db.collection('users', function (err, collection) {
                        collection.update({name:folowUserName},{$pull:{fans:userName}},function(err2,docs2){
                            mongodb.close();
                            if(err2){
                                console.log(err2);
                            }
                            callback(err2,docs2);
                        });
                    });
                }else{
                    callback(err,docs);
                }
            });
        });
    });
}

/**
 * 修改用户信息 目前只有 地区和介绍
 * @param callback
 */
User.prototype.modifyInformation = function(callback){
    var user = this;
    mongodb.open(function (err, db) {
        if (err) {
            mongodb.close();
            return callback(err);
        }
        db.collection('users', function (err, collection) {
            if (err) {
                mongodb.close();
                return callback(err);
            }
            collection.update({name:user.name},{$set:{location:user.location,introduction:user.introduction,portraitSrc:user.portraitSrc}},function(err,docs){
                mongodb.close();
                callback(err,docs);
            });
        });
    });
};

