const ldap = require('ldapjs');

const LDAP_URL = 'ldap://192.168.88.200:389';
const USER_UPN = 'portalservice@mss.local';
const PASSWORD = 'Ankara12!';

console.log('Service account UPN bind test...');
console.log('UPN:', USER_UPN);

const client = ldap.createClient({
  url: LDAP_URL,
  timeout: 10000,
});

client.bind(USER_UPN, PASSWORD, (err) => {
  if (err) {
    console.error('Bind failed:', err.message);
  } else {
    console.log('SUCCESS! portalservice UPN bind worked!');
  }
  client.unbind();
});
