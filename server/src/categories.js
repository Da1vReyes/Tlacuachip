// Maps our business categories to real OpenStreetMap tags so density
// queries reflect what's actually mapped in the area, not invented numbers.
export const CATEGORY_TAGS = {
  cafeteria: [{ key: "amenity", value: "cafe" }],
  restaurante: [{ key: "amenity", value: "restaurant" }],
  "tienda-abarrotes": [
    { key: "shop", value: "convenience" },
    { key: "shop", value: "supermarket" },
  ],
  "salon-belleza": [
    { key: "shop", value: "hairdresser" },
    { key: "shop", value: "beauty" },
  ],
  "taller-mecanico": [{ key: "shop", value: "car_repair" }],
  papeleria: [{ key: "shop", value: "stationery" }],
  otro: [{ key: "shop", value: "*" }],
};

export function tagsForCategory(category) {
  return CATEGORY_TAGS[category] ?? CATEGORY_TAGS.otro;
}
