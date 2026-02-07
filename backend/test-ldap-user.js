const ldap = require('ldapjs');

const LDAP_URL = 'ldap://192.168.88.200:389';
const BASE_DN = 'DC=mss,DC=local';
const BIND_DN = 'CN=portalservice,OU=MSSUsers,DC=mss,DC=local';
const BIND_PASSWORD = 'Ankara12!';

// Test edilecek kullanıcı
const TEST_USER = process.argv[2] || 'alper.es';
const TEST_PASSWORD = process.argv[3] || 'test';

console.log('=== LDAP User Authentication Test ===');
console.log('Test user:', TEST_USER);
console.log('');

const client = ldap.createClient({
  url: LDAP_URL,
  timeout: 10000,
  connectTimeout: 10000,
});

// Step 1: Service account ile bind
console.log('Step 1: Binding with service account...');
client.bind(BIND_DN, BIND_PASSWORD, (err) => {
  if (err) {
    console.error('Service account bind failed:', err.message);
    process.exit(1);
  }

  console.log('Service account bind successful');

  // Step 2: Kullanıcıyı ara
  console.log('\nStep 2: Searching for user:', TEST_USER);

  const searchOptions = {
    filter: `(sAMAccountName=${TEST_USER})`,
    scope: 'sub',
    attributes: ['distinguishedName', 'sAMAccountName', 'displayName', 'mail', 'userPrincipalName'],
  };

  client.search(BASE_DN, searchOptions, (err, res) => {
    if (err) {
      console.error('Search error:', err.message);
      client.unbind();
      return;
    }

    let userDN = null;
    let userInfo = null;

    res.on('searchEntry', (entry) => {
      userDN = entry.dn.toString();
      console.log('Found user DN:', userDN);

      const attrs = entry.pojo?.attributes || [];
      attrs.forEach(attr => {
        console.log(`  ${attr.type}: ${attr.values.join(', ')}`);
      });

      userInfo = {
        dn: userDN,
        upn: attrs.find(a => a.type === 'userPrincipalName')?.values?.[0],
        sam: attrs.find(a => a.type === 'sAMAccountName')?.values?.[0],
      };
    });

    res.on('end', () => {
      client.unbind();

      if (!userDN) {
        console.error('\nUser not found!');
        process.exit(1);
      }

      // Step 3: Kullanıcı credentials ile doğrula
      console.log('\nStep 3: Verifying user password...');
      console.log('Trying DN:', userDN);

      const verifyClient = ldap.createClient({
        url: LDAP_URL,
        timeout: 10000,
      });

      // Try with DN
      verifyClient.bind(userDN, TEST_PASSWORD, (err) => {
        if (err) {
          console.error('DN bind failed:', err.message, '(code:', err.code + ')');

          // Try with UPN
          if (userInfo.upn) {
            console.log('\nTrying UPN:', userInfo.upn);
            const upnClient = ldap.createClient({ url: LDAP_URL });
            upnClient.bind(userInfo.upn, TEST_PASSWORD, (err2) => {
              if (err2) {
                console.error('UPN bind failed:', err2.message);

                // Try with SAM@domain
                const samUpn = `${userInfo.sam}@mss.local`;
                console.log('\nTrying SAM@domain:', samUpn);
                const samClient = ldap.createClient({ url: LDAP_URL });
                samClient.bind(samUpn, TEST_PASSWORD, (err3) => {
                  if (err3) {
                    console.error('SAM@domain bind failed:', err3.message);
                    console.log('\n=== AUTHENTICATION FAILED ===');
                  } else {
                    console.log('SAM@domain bind SUCCESS!');
                    console.log('\n=== AUTHENTICATION SUCCESSFUL ===');
                    samClient.unbind();
                  }
                });
              } else {
                console.log('UPN bind SUCCESS!');
                console.log('\n=== AUTHENTICATION SUCCESSFUL ===');
                upnClient.unbind();
              }
            });
          }
        } else {
          console.log('DN bind SUCCESS!');
          console.log('\n=== AUTHENTICATION SUCCESSFUL ===');
          verifyClient.unbind();
        }
      });
    });
  });
});
