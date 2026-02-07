const ldap = require('ldapjs');

const LDAP_URL = 'ldap://192.168.88.200:389';
const BASE_DN = 'DC=mss,DC=local';
const BIND_DN = 'CN=portalservice,OU=MSSUsers,DC=mss,DC=local';
const BIND_PASSWORD = 'Ankara12!';

console.log('=== LDAP Connection Test ===');
console.log('URL:', LDAP_URL);
console.log('Base DN:', BASE_DN);
console.log('Bind DN:', BIND_DN);
console.log('');

const client = ldap.createClient({
  url: LDAP_URL,
  timeout: 10000,
  connectTimeout: 10000,
});

client.on('error', (err) => {
  console.error('Client error:', err.message);
});

client.on('connect', () => {
  console.log('Connected to LDAP server');
});

// Test 1: Service account bind
console.log('Test 1: Binding with service account...');
client.bind(BIND_DN, BIND_PASSWORD, (err) => {
  if (err) {
    console.error('Bind failed:', err.message);
    console.error('Error code:', err.code);

    // Try UPN format
    console.log('\nTest 2: Trying UPN format...');
    const upn = 'portalservice@mss.local';
    client.bind(upn, BIND_PASSWORD, (err2) => {
      if (err2) {
        console.error('UPN bind failed:', err2.message);

        // Try SAM format
        console.log('\nTest 3: Trying SAM format...');
        const sam = 'MSS\\portalservice';
        client.bind(sam, BIND_PASSWORD, (err3) => {
          if (err3) {
            console.error('SAM bind failed:', err3.message);
            client.unbind();
            process.exit(1);
          } else {
            console.log('SAM bind successful!');
            searchUsers(client);
          }
        });
      } else {
        console.log('UPN bind successful!');
        searchUsers(client);
      }
    });
  } else {
    console.log('Bind successful!');
    searchUsers(client);
  }
});

function searchUsers(client) {
  console.log('\nSearching for users...');

  const searchOptions = {
    filter: '(objectClass=user)',
    scope: 'sub',
    attributes: ['sAMAccountName', 'displayName', 'mail'],
    sizeLimit: 5,
  };

  client.search(BASE_DN, searchOptions, (err, res) => {
    if (err) {
      console.error('Search error:', err.message);
      client.unbind();
      return;
    }

    res.on('searchEntry', (entry) => {
      console.log('Found user:', entry.pojo?.attributes?.find(a => a.type === 'sAMAccountName')?.values?.[0]);
    });

    res.on('error', (err) => {
      console.error('Search stream error:', err.message);
    });

    res.on('end', (result) => {
      console.log('\nSearch completed. Status:', result.status);
      client.unbind();
    });
  });
}
