const Puppeteer = require("puppeteer");
const Cheerio = require("cheerio");
const fs = require('fs');
const httpBuildQuery = require('http-build-query');
const cheerioTableparser = require('cheerio-tableparser');
const striptags = require('striptags');
'use strict';

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms)
    });
}

const bot = {
    page: null,
    startBrowser: null,
    client: null,
    cookie: 'cookies.json',
    cekCookie: async() => {
        const cek_file_cookie = fs.existsSync(bot.cookie)
        if (cek_file_cookie === true) {
            const baca_cookie = fs.readFileSync(bot.cookie)
            const parse_cookie = JSON.parse(baca_cookie)
            if (baca_cookie.length > 0) {
                if (parse_cookie[0].name == "Cookie-NS-Mklikbca" || parse_cookie[0].name == "citrix_ns_id") {
                    for (const cookiex of parse_cookie) {
                        bot.page.setCookie(cookiex)
                    }
                    console.log('Cookie tersedia & digunakan')
                } else {
                    console.log('Try 5 minute again!')
                    process.exit(1)
                }

            } else {
                console.log('Cookie kosong')
                return
            }
        }
    },
    launch: async() => {
        console.log('starting...')
        bot.startBrowser = await Puppeteer.launch({
            headless: true,
            args: ["--disable-web-security"]
        });
        bot.page = await bot.startBrowser.newPage();
        await bot.page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1');

    },
    login: async(url, username, passoword) => {
        await bot.launch();
        console.log('try login')

        await bot.page.goto(url, {
            waitUntil: "networkidle0",
        });
        await bot.page.type('input[name="value(user_id)"]', username)
        await bot.page.type('input[name="value(pswd)"]', passoword)
        await bot.page.click('input[name="value(Submit)"]')
        await bot.page.waitForTimeout(3000)
        const cookie = await bot.page.cookies()
            // console.log(cookie)
        try {
            fs.writeFileSync(bot.cookie, JSON.stringify(cookie))
            console.log('Cookie disimpan')
        } catch (err) {
            throw err;
        }

    },
    balance: async(url, screenshot) => {
        bot.cekCookie()
        const baca_cookie = fs.readFileSync(bot.cookie)
        const parse_cookie = JSON.parse(baca_cookie)
        let coky = null
        if ('citrix_ns_id' in parse_cookie) {
            coky = parse_cookie[0].name + '=' + parse_cookie[0].value + ';' + parse_cookie[1].name + '=' + parse_cookie[1].value + ';' + parse_cookie[2].name + '=' + parse_cookie[2].value
        } else {
            coky = parse_cookie[0].name + '=' + parse_cookie[0].value + ';' + parse_cookie[1].name + '=' + parse_cookie[1].value
        }

        await bot.page.setRequestInterception(true)
        bot.page.on('request', request => {
            var data = {
                'method': 'POST',
                'headers': {
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': coky,
                    'Referer': 'https://m.klikbca.com/accountstmt.do?value(actions)=menu',
                }

            };
            request.continue(data)
        });

        await bot.page.goto(url)
        const html = await bot.page.content()
        const informasi_rekening = {}
        const $ = Cheerio.load(html)
        $('table tr td font b').each((index, element) => {
            if (index == 2) {
                informasi_rekening['rekening'] = $(element).text().trim()
            } else if (index == 3) {
                informasi_rekening['type'] = $(element).text().trim()
            } else if (index == 4) {
                informasi_rekening['saldo'] = $(element).text().trim()
            }
        });

        console.log(informasi_rekening)

        if (screenshot === true) {
            await bot.page.screenshot({
                path: 'info_rekening.png'
            });
            console.log('berhasil screenshot')
        }
    },
    mutasi: async(url, start, end, screenshot) => {
        let startObj = {}
        let endObj = {}
        const splitstart = start.split('-')
        const splitend = end.split('-')
        if (splitstart.length < 3 || splitend.length < 3) {
            console.log('format tanggal harus d-m-y')
            return
        } else {
            startObj['value(startDt)'] = splitstart[0]
            startObj['value(startMt)'] = splitstart[1]
            startObj['value(startYr)'] = splitstart[2]
            endObj['value(endDt)'] = splitend[0]
            endObj['value(endMt)'] = splitend[1]
            endObj['value(endYr)'] = splitend[2]
        }
        const params = httpBuildQuery(Object.assign({
            'value(r1)': 1,
            'value(D1)': 0
        }, startObj, endObj))

        bot.cekCookie()
        const baca_cookie = fs.readFileSync(bot.cookie)
        const parse_cookie = JSON.parse(baca_cookie)
        let coky = null
        if ('citrix_ns_id' in parse_cookie) {
            coky = parse_cookie[0].name + '=' + parse_cookie[0].value + ';' + parse_cookie[1].name + '=' + parse_cookie[1].value + ';' + parse_cookie[2].name + '=' + parse_cookie[2].value
        } else {
            coky = parse_cookie[0].name + '=' + parse_cookie[0].value + ';' + parse_cookie[1].name + '=' + parse_cookie[1].value
        }
        await bot.page.setRequestInterception(true)
        bot.page.on('request', request => {
            var data = {
                'method': 'POST',
                'postData': params,
                'headers': {
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Cookie': coky,
                    'Referer': 'https://m.klikbca.com/accountstmt.do?value(actions)=acct_stmt',
                }

            };
            request.continue(data)
        });
        await bot.page.waitForTimeout(2000)
        await bot.page.goto(url)
        const html = await bot.page.content()
        const dataArray = []
        const datamutasi = []
        let mutasi = []
        const $ = Cheerio.load(html)
        $('table tr td:nth-child(3)').each((index, element) => {
            if (index == 0) {
                datamutasi['rekening'] = $(element).text().trim()
            } else if (index == 1) {
                datamutasi['an'] = $(element).text().trim()
            } else if (index == 2) {
                datamutasi['periode'] = $(element).text().trim()
            } else if (index == 3) {
                datamutasi['matauang'] = $(element).text().trim()
            }

        })
        cheerioTableparser($);
        const table = $(".blue").parsetable()[1].map(val => {
            if (val != null) {
                return val;
            }
        });
        const $x = Cheerio.load(table.toString())
        $x('table tr[bgcolor]').each((index, element) => {
            var td = $x(element).html()
            let td1 = striptags(td, ['td', 'br']).replace(/\n|\t|<td valign="top">|<td>/g, '')
            let pecah = td1
            dataArray.push(pecah)
        })

        dataArray.map((arr) => {
            let tampung = {}
            let split = arr.split('</td>')
            split.pop()
            split.forEach((val, key) => {
                if (key == 1) {
                    let des = val.toString().split('<br>')
                    let rp = des.at(-1)
                    tampung['amount'] = rp.substring(rp.length - 3, 0).replace('\,', '.')
                    tampung['desc'] = striptags(val.toString())
                } else if (key == 0) {
                    tampung['date'] = val
                } else if (key == 2) {
                    tampung['type'] = val
                }

            })
            mutasi.push(tampung)
        })
        datamutasi['mutasi'] = mutasi
        console.log(datamutasi)

        if (screenshot === true) {
            await bot.page.screenshot({
                path: 'info_mutasi.png'
            });
            console.log('berhasil screenshot')
        }


    },
    logout: async(url) => {
        await bot.page.waitForTimeout(5000)
        bot.cekCookie()
        await bot.page.goto(url)
        console.log('Berhasil logout')
        process.exit(1)
    }

}
module.exports = {
    bot,
    sleep
}