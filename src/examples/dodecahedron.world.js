pentagon = [
  [0, -8],
  [7.608452, -2.472136],
  [4.702282, 6.472136],
  [-4.702282, 6.472136],
  [-7.608452, -2.472136],
];

PolygonFace("top", "#d95f5f", pentagon);
PolygonFace("upper-0", "#4f9d69", pentagon);
PolygonFace("upper-1", "#5f79d9", pentagon);
PolygonFace("upper-2", "#d9b44f", pentagon);
PolygonFace("upper-3", "#8f6ed5", pentagon);
PolygonFace("upper-4", "#4fb8c7", pentagon);
PolygonFace("lower-0", "#d76f9f", pentagon);
PolygonFace("lower-1", "#73a857", pentagon);
PolygonFace("lower-2", "#d08b49", pentagon);
PolygonFace("lower-3", "#56a6a6", pentagon);
PolygonFace("lower-4", "#a06fc0", pentagon);
PolygonFace("bottom", "#c0a35c", pentagon);

Portal("top", 0, "upper-0", 0);
Portal("top", 1, "upper-1", 0);
Portal("top", 2, "upper-2", 0);
Portal("top", 3, "upper-3", 0);
Portal("top", 4, "upper-4", 0);

Portal("upper-0", 1, "upper-1", 4);
Portal("upper-1", 1, "upper-2", 4);
Portal("upper-2", 1, "upper-3", 4);
Portal("upper-3", 1, "upper-4", 4);
Portal("upper-4", 1, "upper-0", 4);

Portal("upper-0", 2, "lower-0", 0);
Portal("upper-1", 2, "lower-1", 0);
Portal("upper-2", 2, "lower-2", 0);
Portal("upper-3", 2, "lower-3", 0);
Portal("upper-4", 2, "lower-4", 0);

Portal("upper-0", 3, "lower-4", 1);
Portal("upper-1", 3, "lower-0", 1);
Portal("upper-2", 3, "lower-1", 1);
Portal("upper-3", 3, "lower-2", 1);
Portal("upper-4", 3, "lower-3", 1);

Portal("lower-0", 3, "lower-1", 4);
Portal("lower-1", 3, "lower-2", 4);
Portal("lower-2", 3, "lower-3", 4);
Portal("lower-3", 3, "lower-4", 4);
Portal("lower-4", 3, "lower-0", 4);

Portal("bottom", 0, "lower-0", 2);
Portal("bottom", 1, "lower-1", 2);
Portal("bottom", 2, "lower-2", 2);
Portal("bottom", 3, "lower-3", 2);
Portal("bottom", 4, "lower-4", 2);

top_clock = clock("top-clock", {
  position: [0, 0, 0],
  scale: 2,
});

top_marmot = geodesic_marmot("top-geodesci-marmot", {
  position: [-3.2, 0, -1.7],
  scale: 1.05,
  velocity: [1.8, 0.75],
});

upper_0_house = house("upper-0-house", {
  position: [-1.6, 0, 0.8],
  scale: 3,
  yaw: 0.35,
});

upper_1_tree = tree("upper-1-tree", {
  position: [0.6, 0, 0.4],
  scale: 1,
  yaw: -0.4,
});

upper_2_campfire = campfire("upper-2-campfire", {
  position: [0.2, 0, -0.7],
  scale: 2,
});

upper_3_button = emergency_button("upper-3-button", {
  position: [0.3, 0, 0.1],
  scale: 2,
  yaw: 0.5,
});

upper_4_rocks = rocks("upper-4-rocks", {
  position: [-0.5, 0, -0.5],
  scale: 2,
  yaw: -0.25,
});

bottom_campfire = campfire("bottom-campfire", {
  position: [0, 0, 0],
  scale: 2,
});

OnFace("top", [top_clock, top_marmot]);
OnFace("upper-0", [upper_0_house]);
OnFace("upper-1", [upper_1_tree]);
OnFace("upper-2", [upper_2_campfire]);
OnFace("upper-3", [upper_3_button]);
OnFace("upper-4", [upper_4_rocks]);
OnFace("bottom", [bottom_campfire]);
