const botx = require('./bot');

(async() => {
    await botx.bot.login('https://m.klikbca.com/login.jsp', 'USERNAME', 'PIN');
    await botx.bot.balance('https://m.klikbca.com/balanceinquiry.do', true);
    //await botx.bot.mutasi('https://m.klikbca.com/accountstmt.do?value(actions)=acctstmtview', '1-06-2022', '05-06-2022', true);
    await botx.bot.logout('https://m.klikbca.com/authentication.do?value(actions)=logout');

})()