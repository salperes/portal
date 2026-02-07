const ldap = require('ldapjs');

const LDAP_URL = 'ldap://192.168.88.200:389';
const USER_UPN = 'test.user@mss.local';
const PASSWORD = 'Ankara12!mss';

console.log('Testing new user...');
console.log('UPN:', USER_UPN);

const client = ldap.createClient({
  url: LDAP_URL,
  timeout: 10000,
});

client.bind(USER_UPN, PASSWORD, (err) => {
  if (err) {
    console.error('Bind failed:', err.message);
    console.error('Error code:', err.code);
  } else {
    console.log('SUCCESS! test.user authentication worked!');
  }
  client.unbind();
});
