import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ldap from 'ldapjs';

export interface LdapUserInfo {
  username: string;
  displayName: string;
  email: string;
  department: string;
  title: string;
  phone: string;
  memberOf: string[];
}

@Injectable()
export class LdapService {
  private readonly logger = new Logger(LdapService.name);

  constructor(private configService: ConfigService) {}

  async authenticate(
    username: string,
    password: string,
  ): Promise<LdapUserInfo> {
    const ldapUrl = this.configService.get<string>('ldap.url') || '';
    const baseDN = this.configService.get<string>('ldap.baseDN') || '';
    const bindDN = this.configService.get<string>('ldap.bindDN') || '';
    const bindPassword = this.configService.get<string>('ldap.bindPassword') || '';

    this.logger.log(`=== LDAP Auth Start ===`);
    this.logger.log(`Username: ${username}`);
    this.logger.log(`LDAP URL: ${ldapUrl}`);
    this.logger.log(`Base DN: ${baseDN}`);
    this.logger.log(`Bind DN: ${bindDN}`);
    this.logger.log(`Has Bind Password: ${!!bindPassword}`);

    if (ldapUrl === 'mock' || ldapUrl === '') {
      this.logger.warn('Using mock authentication');
      return this.mockAuthenticate(username, password);
    }

    return new Promise((resolve, reject) => {
      // Step 1: Connect and bind with service account
      this.logger.log('Step 1: Creating LDAP client...');
      const client = ldap.createClient({
        url: ldapUrl,
        timeout: 10000,
        connectTimeout: 10000,
      });

      client.on('error', (err) => {
        this.logger.error(`Client error: ${err.message}`);
        reject(new UnauthorizedException('LDAP bağlantı hatası'));
      });

      this.logger.log('Step 2: Binding with service account...');
      client.bind(bindDN, bindPassword, (bindErr) => {
        if (bindErr) {
          this.logger.error(`Service bind failed: ${bindErr.message}`);
          client.unbind();
          reject(new UnauthorizedException('Servis hesabı bağlantı hatası'));
          return;
        }

        this.logger.log('Service bind successful');

        // Step 2: Search for user
        this.logger.log(`Step 3: Searching for user: ${username}`);
        const searchOptions: ldap.SearchOptions = {
          filter: `(sAMAccountName=${username})`,
          scope: 'sub',
          attributes: [
            'distinguishedName',
            'sAMAccountName',
            'displayName',
            'mail',
            'department',
            'title',
            'telephoneNumber',
            'memberOf',
          ],
        };

        client.search(baseDN, searchOptions, (searchErr, res) => {
          if (searchErr) {
            this.logger.error(`Search error: ${searchErr.message}`);
            client.unbind();
            reject(new UnauthorizedException('Kullanıcı arama hatası'));
            return;
          }

          let userDN: string | null = null;
          let userInfo: LdapUserInfo | null = null;

          res.on('searchEntry', (entry) => {
            // Use distinguishedName attribute (plain UTF-8) instead of entry.dn.toString()
            // which escapes non-ASCII chars (\c3\96 for Ö) causing bind failures
            const dnFromAttr = entry.pojo?.attributes?.find(
              (a: { type: string }) => a.type.toLowerCase() === 'distinguishedname'
            )?.values?.[0];
            userDN = dnFromAttr || entry.dn.toString();
            this.logger.log(`Found user DN: ${userDN}`);

            const getAttr = (name: string): string => {
              const attr = entry.pojo?.attributes?.find(
                (a: { type: string }) => a.type.toLowerCase() === name.toLowerCase()
              );
              return attr?.values?.[0] || '';
            };

            const getAttrArray = (name: string): string[] => {
              const attr = entry.pojo?.attributes?.find(
                (a: { type: string }) => a.type.toLowerCase() === name.toLowerCase()
              );
              return attr?.values || [];
            };

            userInfo = {
              username: getAttr('sAMAccountName') || username,
              displayName: getAttr('displayName') || username,
              email: getAttr('mail') || '',
              department: getAttr('department') || '',
              title: getAttr('title') || '',
              phone: getAttr('telephoneNumber') || '',
              memberOf: getAttrArray('memberOf'),
            };
          });

          res.on('error', (err) => {
            this.logger.error(`Search stream error: ${err.message}`);
          });

          res.on('end', () => {
            if (!userDN || !userInfo) {
              this.logger.warn('User not found');
              client.unbind();
              reject(new UnauthorizedException('Kullanıcı bulunamadı'));
              return;
            }

            this.logger.log('User found, verifying password...');

            // Step 3: Verify user password
            this.logger.log(`Step 4: Verifying password with DN: ${userDN}`);

            const verifyClient = ldap.createClient({
              url: ldapUrl,
              timeout: 10000,
            });

            verifyClient.bind(userDN, password, (verifyErr) => {
              client.unbind();

              if (verifyErr) {
                this.logger.error(`Password verify failed: ${verifyErr.message}`);
                verifyClient.unbind();
                reject(new UnauthorizedException('Geçersiz şifre'));
                return;
              }

              this.logger.log('Password verified successfully!');
              verifyClient.unbind();
              this.logger.log('=== LDAP Auth Success ===');
              resolve(userInfo!);
            });
          });
        });
      });
    });
  }

  private mockAuthenticate(username: string, password: string): Promise<LdapUserInfo> {
    const testUsers: Record<string, LdapUserInfo> = {
      admin: {
        username: 'admin',
        displayName: 'Portal Admin',
        email: 'admin@mss.local',
        department: 'IT',
        title: 'Admin',
        phone: '',
        memberOf: ['Portal_Admins'],
      },
    };

    return new Promise((resolve, reject) => {
      if (password === 'Ankara12!mss' && testUsers[username]) {
        resolve(testUsers[username]);
      } else {
        reject(new UnauthorizedException('Geçersiz kullanıcı adı veya şifre'));
      }
    });
  }
}
