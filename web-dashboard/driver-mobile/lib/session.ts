let isDriverLoggedIn = false;

export function setDriverLoggedIn(value: boolean) {
  isDriverLoggedIn = value;
}

export function getDriverLoggedIn() {
  return isDriverLoggedIn;
}