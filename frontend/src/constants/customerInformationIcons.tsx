import React from "react";
import {
  UserRound, Mail, Phone, MapPin, Building2, Map, Hash, Globe,
  MessageSquare, Pencil, Save, X, ContactRound,
} from "lucide-react";

// Dedicated Customer Information icon registry.
// Each identifier maps to one fixed icon. Icons are never swapped based on
// selection state, typing, or navigation.

export const CUSTOMER_INFO_ICONS = {
  "customer-name": <UserRound size={18} />,
  "customer-email": <Mail size={18} />,
  "customer-phone": <Phone size={18} />,
  "customer-address": <MapPin size={18} />,
  "customer-city": <Building2 size={18} />,
  "customer-province": <Map size={18} />,
  "customer-postal-code": <Hash size={18} />,
  "customer-country": <Globe size={18} />,
  "customer-notes": <MessageSquare size={18} />,
  "customer-edit": <Pencil size={16} />,
  "customer-save": <Save size={16} />,
  "customer-cancel": <X size={16} />,
  "customer-contact": <ContactRound size={18} />,
} as const;

export type CustomerInfoIconKey = keyof typeof CUSTOMER_INFO_ICONS;

export function getCustomerInfoIcon(key: CustomerInfoIconKey): React.ReactNode {
  return CUSTOMER_INFO_ICONS[key];
}
