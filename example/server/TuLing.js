const axios = require('axios')
module.exports = function ask(info) {
  return axios.post('http://www.tuling123.com/openapi/api', {
    key: 'f359e6dc4b144901ac8e4d0d5288f98d',
    userid: 'tang',
    info
  }).then((data) => {
    return data.data.text
  })
}
