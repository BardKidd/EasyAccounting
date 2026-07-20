import { ProfileInfoCard } from './profileInfoCard';
import { ChangePasswordCard } from './changePasswordCard';
import { DeleteAccountCard } from './deleteAccountCard';

export function ProfileSettings() {
  return (
    <div className="space-y-6">
      <ProfileInfoCard />
      <ChangePasswordCard />
      <DeleteAccountCard />
    </div>
  );
}

export default ProfileSettings;
