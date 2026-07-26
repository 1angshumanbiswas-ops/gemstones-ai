export interface NumerologyProfile {
  /** Mulank (root/birth number), 1-9, from date-of-month */
  mulank: number;
  /** Bhagyank (destiny number), 1-9 or master 11/22, from full DOB */
  bhagyank: number;
  personalYear: number;
  personalMonth: number;
  /** Numbers considered compatible with both mulank and bhagyank,
   *  per the Chaldean/Vedic mapping the Numerology Agent uses */
  compatibleNumbers: number[];
  referenceDate: string;
}
