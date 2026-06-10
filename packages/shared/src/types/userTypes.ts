export interface UserType {
  name: string;
  email: string;
  isGuest: boolean;
  // 本位幣（報表 / 淨值呈現用的個人偏好），預設 'TWD'
  baseCurrencyCode: string;
}
