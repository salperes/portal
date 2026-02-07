const ldap = require('ldapjs');

const LDAP_URL = 'ldap://192.168.88.200:389';
const BASE_DN = 'DC=mss,DC=local';
const BIND_DN = 'CN=portalservice,OU=MSSUsers,DC=mss,DC=local';
const BIND_PASSWORD = 'Ankara12!';

const TEST_USER = 'test.user';
const TEST_PASSWORD = 'Ankara12!mss';

console.log('=== Full Authentication Flow Test ===\n');

const client = ldap.createClient({
  url: LDAP_URL,
  timeout: 10000,
});

// Step 1: Service account bind
console.log('Step 1: Service account bind...');
client.bind(BIND_DN, BIND_PASSWORD, (err) => {
  if (err) {
    console.error('FAILED:', err.message);
    return;
  }
  console.log('SUCCESS\n');

  // Step 2: Search for user
  console.log('Step 2: Search for user "' + TEST_USER + '"...');

  const searchOptions = {
    filter: `(sAMAccountName=${TEST_USER})`,
    scope: 'sub',
    attributes: ['distinguishedName', 'sAMAccountName', 'displayName'],
  };

  client.search(BASE_DN, searchOptions, (err, res) => {
    if (err) {
      console.error('Search error:', err.message);
      client.unbind();
      return;
    }

    let userDN = null;

    res.on('searchEntry', (entry) => {
      userDN = entry.dn.toString();
      console.log('Found DN:', userDN);
    });

    res.on('end', () => {
      if (!userDN) {
        console.error('User not found!');
        client.unbind();
        return;
      }
      console.log('SUCCESS\n');

      // Step 3: Verify password with user DN
      console.log('Step 3: Verify password with DN...');
      console.log('DN:', userDN);
      console.log('Password:', TEST_PASSWORD);

      const verifyClient = ldap.createClient({
        url: LDAP_URL,
        timeout: 10000,
      });

      verifyClient.bind(userDN, TEST_PASSWORD, (err) => {
        if (err) {
          console.error('DN bind FAILED:', err.message);
          console.log('\nStep 4: Try UPN format...');

          const upn = TEST_USER + '@mss.local';
          console.log('UPN:', upn);

          const upnClient = ldap.createClient({ url: LDAP_URL });
          upnClient.bind(upn, TEST_PASSWORD, (err2) => {
            if (err2) {
              console.error('UPN bind FAILED:', err2.message);
              console.log('\n=== AUTHENTICATION FAILED ===');
            } else {
              console.log('UPN bind SUCCESS!');
              console.log('\n=== AUTHENTICATION SUCCESSFUL ===');
              upnClient.unbind();
            }
            client.unbind();
          });
        } else {
          console.log('DN bind SUCCESS!');
          console.log('\n=== AUTHENTICATION SUCCESSFUL ===');
          verifyClient.unbind();
          client.unbind();
        }
      });
    });
  });
});
