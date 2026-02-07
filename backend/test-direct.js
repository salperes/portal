const ldap = require('ldapjs');

const LDAP_URL = 'ldap://192.168.88.200:389';
const USER_UPN = 'alper.es@mss.local';
const PASSWORD = 'Audi85144!mss!';

console.log('Direct UPN bind test...');
console.log('UPN:', USER_UPN);
console.log('Password length:', PASSWORD.length);

const client = ldap.createClient({
  url: LDAP_URL,
  timeout: 10000,
});

client.bind(USER_UPN, PASSWORD, (err) => {
  if (err) {
    console.error('Bind failed:', err.message);
    console.error('Error code:', err.code);
    console.error('Full error:', JSON.stringify(err, null, 2));
  } else {
    console.log('SUCCESS! Authentication worked!');
  }
  client.unbind();
});
