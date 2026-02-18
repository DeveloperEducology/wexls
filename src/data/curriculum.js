// Complete curriculum data structure
// Hierarchy: Grades → Subjects → Units → Microskills

export const grades = [
    { "id": "0f5a4269-1ebd-4a07-bdf3-b1bd383dbe47", "name": "Class 9", "sort_order": 9, "color_hex": "#4CAF50", "created_at": "2026-02-10 02:06:54.780331+00" },
    { "id": "237c7950-c582-4fc6-82ac-3a67b910f536", "name": "Class 3", "sort_order": 3, "color_hex": "#FF9800", "created_at": "2026-01-27 18:13:20.771251+00" },
    { "id": "4e186e49-cd6f-41e3-aa67-31cd709fd386", "name": "Class 2", "sort_order": 2, "color_hex": "#2196F3", "created_at": "2026-01-27 18:13:20.771251+00" },
    { "id": "527da777-2f56-458c-977b-d8897bdefc13", "name": "Class 4", "sort_order": 4, "color_hex": "#9C27B0", "created_at": "2026-01-27 18:13:20.771251+00" },
    { "id": "9cd8b0f3-5d36-46ce-b278-c48f506bb8c6", "name": "Class 2(CBSE)", "sort_order": 0, "color_hex": "#4CAF50", "created_at": "2026-01-31 12:29:14.439943+00" },
    { "id": "cf117338-6646-419b-a991-88773b8b5c68", "name": "class 6", "sort_order": 5, "color_hex": "#9C27B0", "created_at": "2026-01-28 08:15:19.436001+00" },
    { "id": "ddd6e32b-75ce-4e27-86bc-ef1adb671178", "name": "Class 1", "sort_order": 1, "color_hex": "#4CAF50", "created_at": "2026-01-27 18:13:20.771251+00" }
];

export const subjects = [
    { "id": "32d28536-b8c3-4db3-adaa-5cbc44b0c42b", "grade_id": "9cd8b0f3-5d36-46ce-b278-c48f506bb8c6", "name": "Mathamatics", "slug": "math", "created_at": "2026-01-31 12:34:47.340061+00" },
    { "id": "331c169a-ea39-4491-8586-403eec509473", "grade_id": "4e186e49-cd6f-41e3-aa67-31cd709fd386", "name": "Science", "slug": "science", "created_at": "2026-01-27 18:13:20.771251+00" },
    { "id": "4b44fa0b-c19b-4abb-b36e-15f06203b7da", "grade_id": "4e186e49-cd6f-41e3-aa67-31cd709fd386", "name": "English", "slug": "english", "created_at": "2026-01-27 18:13:20.771251+00" },
    { "id": "520daaef-416b-45be-be33-c211b17216c2", "grade_id": "9cd8b0f3-5d36-46ce-b278-c48f506bb8c6", "name": "SCIENCE", "slug": "science", "created_at": "2026-02-07 15:06:43.00824+00" },
    { "id": "6eeeb4ff-08b3-41a8-8631-fd56a7d442a4", "grade_id": "0f5a4269-1ebd-4a07-bdf3-b1bd383dbe47", "name": "SCIENCE", "slug": "science", "created_at": "2026-02-10 02:07:15.725528+00" },
    { "id": "706d78f1-f01b-4108-82e3-4d91597dea2d", "grade_id": "527da777-2f56-458c-977b-d8897bdefc13", "name": "Math", "slug": "math", "created_at": "2026-01-27 18:13:20.771251+00" },
    { "id": "ab8b0862-3d0d-4195-8508-8d74c9becf8c", "grade_id": "ddd6e32b-75ce-4e27-86bc-ef1adb671178", "name": "English", "slug": "english", "created_at": "2026-01-27 18:13:20.771251+00" },
    { "id": "b20b68cd-86e7-42a3-aad5-7dfb248e2d18", "grade_id": "237c7950-c582-4fc6-82ac-3a67b910f536", "name": "Math", "slug": "math", "created_at": "2026-01-27 18:13:20.771251+00" },
    { "id": "d7581c5f-d3db-45ac-a164-034080517960", "grade_id": "4e186e49-cd6f-41e3-aa67-31cd709fd386", "name": "Math", "slug": "math", "created_at": "2026-01-27 18:13:20.771251+00" },
    { "id": "f48883c9-eef2-476e-b0df-261ecc1acd4e", "grade_id": "ddd6e32b-75ce-4e27-86bc-ef1adb671178", "name": "Math", "slug": "math", "created_at": "2026-01-27 18:13:20.771251+00" }
];

export const units = [
    { "id": "030424e3-3d8f-4239-96aa-85ed13ad519e", "subject_id": "d7581c5f-d3db-45ac-a164-034080517960", "name": "Addition", "code": "ADD-01", "sort_order": 4, "created_at": "2026-01-27 18:13:20.771251+00" },
    { "id": "04cb1362-e6c0-43bf-a793-d48ca7cdff9c", "subject_id": "4b44fa0b-c19b-4abb-b36e-15f06203b7da", "name": "Syllables", "code": "S-1", "sort_order": 1, "created_at": "2026-01-29 10:22:08.354208+00" },
    { "id": "160c0a33-27ce-47da-b959-dc86b942d34f", "subject_id": "4b44fa0b-c19b-4abb-b36e-15f06203b7da", "name": "Sort by the number of syllables", "code": "S", "sort_order": 5, "created_at": "2026-01-30 11:00:49.626374+00" },
    { "id": "1b6a3a12-2add-412b-b744-7ec3ca1188c4", "subject_id": "4b44fa0b-c19b-4abb-b36e-15f06203b7da", "name": "CBSE English", "code": "C", "sort_order": 0, "created_at": "2026-01-29 14:55:19.866304+00" },
    { "id": "1ce97fc2-9483-43cd-9965-0756d8087342", "subject_id": "4b44fa0b-c19b-4abb-b36e-15f06203b7da", "name": "Rhyming", "code": "R-1", "sort_order": 2, "created_at": "2026-01-29 10:22:31.679658+00" },
    { "id": "39c2b14c-ba41-42b8-8fe1-376b8d52b001", "subject_id": "d7581c5f-d3db-45ac-a164-034080517960", "name": "Number Sense", "code": "NS-01", "sort_order": 5, "created_at": "2026-01-27 18:13:20.771251+00" },
    { "id": "41b4d133-93ea-474a-a6fe-745fd038c741", "subject_id": "32d28536-b8c3-4db3-adaa-5cbc44b0c42b", "name": "Rani's Gift (Measurement)", "code": "UNIT-07", "sort_order": 7, "created_at": "2026-01-31 13:13:26.178297+00" },
    { "id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "subject_id": "32d28536-b8c3-4db3-adaa-5cbc44b0c42b", "name": "A Day at the Beach (Counting in Groups)", "code": "UNIT-01", "sort_order": 1, "created_at": "2026-01-31 13:13:26.178297+00" },
    { "id": "5c873e6d-afec-4942-8e70-a21a4c1752a9", "subject_id": "32d28536-b8c3-4db3-adaa-5cbc44b0c42b", "name": "Shapes Around Us (3D Shapes)", "code": "UNIT-02", "sort_order": 2, "created_at": "2026-01-31 13:13:26.178297+00" },
    { "id": "5e345cfe-314e-4a3c-a3d3-aa6841deb72c", "subject_id": "d7581c5f-d3db-45ac-a164-034080517960", "name": "Comparing and ordering", "code": "CO-01", "sort_order": 2, "created_at": "2026-01-28 12:10:44.482449+00" },
    { "id": "6e701392-7a96-41ee-8a94-21c7f4813074", "subject_id": "32d28536-b8c3-4db3-adaa-5cbc44b0c42b", "name": "Grouping and Sharing (Multiplication and Division)", "code": "UNIT-08", "sort_order": 8, "created_at": "2026-01-31 13:13:26.178297+00" },
    { "id": "79406a3e-ac77-4a09-b005-df93d179d1dd", "subject_id": "331c169a-ea39-4491-8586-403eec509473", "name": "Materials", "code": "A", "sort_order": 1, "created_at": "2026-01-30 14:37:22.344114+00" },
    { "id": "95588b81-3933-4f9c-a941-ed8a957fbe2d", "subject_id": "32d28536-b8c3-4db3-adaa-5cbc44b0c42b", "name": "Shadow Story (Togalu) (2D Shapes)", "code": "UNIT-04", "sort_order": 4, "created_at": "2026-01-31 13:13:26.178297+00" },
    { "id": "b48cdaa7-debf-4824-89a6-5bb6fd6e53b0", "subject_id": "520daaef-416b-45be-be33-c211b17216c2", "name": "WATER", "code": "W", "sort_order": 1, "created_at": "2026-02-07 15:07:38.744547+00" },
    { "id": "b686c250-4c6e-4844-a2b1-866ccb5cc03e", "subject_id": "32d28536-b8c3-4db3-adaa-5cbc44b0c42b", "name": "Playing with Lines (Orientations of a line)", "code": "UNIT-05", "sort_order": 5, "created_at": "2026-01-31 13:13:26.178297+00" },
    { "id": "ba3054bb-2a30-4d54-bd75-cb2ec879eaa5", "subject_id": "4b44fa0b-c19b-4abb-b36e-15f06203b7da", "name": "Picture Reading", "code": "CBSE", "sort_order": 2, "created_at": "2026-01-31 03:26:11.359936+00" },
    { "id": "bb517a42-3b66-4dc1-8aa4-88dd01a9d2d9", "subject_id": "32d28536-b8c3-4db3-adaa-5cbc44b0c42b", "name": "Which Season is it? (Measurement of Time)", "code": "UNIT-09", "sort_order": 9, "created_at": "2026-01-31 13:13:26.178297+00" },
    { "id": "ca84d2bc-43db-4622-a7d3-bf41a8560a6a", "subject_id": "d7581c5f-d3db-45ac-a164-034080517960", "name": "Names of numbers", "code": "NN-01", "sort_order": 3, "created_at": "2026-01-28 12:11:14.36935+00" },
    { "id": "d551e82f-00ef-4a8c-97bf-f1918b657133", "subject_id": "6eeeb4ff-08b3-41a8-8631-fd56a7d442a4", "name": "Matter in Our Surroundings", "code": "A.1", "sort_order": 1, "created_at": "2026-02-10 02:07:58.313049+00" },
    { "id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "subject_id": "32d28536-b8c3-4db3-adaa-5cbc44b0c42b", "name": "Fun at the Fair (Money)", "code": "UNIT-10", "sort_order": 10, "created_at": "2026-01-31 13:13:26.178297+00" },
    { "id": "d9f15752-22fa-4573-9eb8-8b5fba773682", "subject_id": "32d28536-b8c3-4db3-adaa-5cbc44b0c42b", "name": "Decoration for Festival (Addition and Subtraction)", "code": "UNIT-06", "sort_order": 6, "created_at": "2026-01-31 13:13:26.178297+00" },
    { "id": "dcccab58-cf92-41bc-bdc8-4f8591061adc", "subject_id": "d7581c5f-d3db-45ac-a164-034080517960", "name": "Counting and number patterns", "code": "cn", "sort_order": 1, "created_at": "2026-01-28 11:57:54.711787+00" },
    { "id": "f3614dcc-5c0d-45e1-9fec-1a70bd8d6134", "subject_id": "32d28536-b8c3-4db3-adaa-5cbc44b0c42b", "name": "Fun with Numbers (Numbers 1 to 100)", "code": "UNIT-03", "sort_order": 3, "created_at": "2026-01-31 13:13:26.178297+00" },
    { "id": "f40cff75-be07-4f5f-984b-3acf7b0404cd", "subject_id": "4b44fa0b-c19b-4abb-b36e-15f06203b7da", "name": "Picture to word", "code": "PW", "sort_order": 2, "created_at": "2026-01-30 01:42:19.92037+00" },
    { "id": "f7a09524-5133-4f83-9a4e-a52e6e636a56", "subject_id": "32d28536-b8c3-4db3-adaa-5cbc44b0c42b", "name": "Data Handling", "code": "UNIT-11", "sort_order": 11, "created_at": "2026-01-31 13:13:26.178297+00" },
    { "id": "f8958db8-5be6-4e1f-9d70-20ec4d681d19", "subject_id": "4b44fa0b-c19b-4abb-b36e-15f06203b7da", "name": "Consonant blends and digraphs", "code": "CB", "sort_order": 4, "created_at": "2026-01-30 04:01:21.431915+00" }
];

export const microskills = [
    { "id": "7dfaf3d6-14c0-49f9-98b2-9a551d5280e1", "unit_id": "d551e82f-00ef-4a8c-97bf-f1918b657133", "name": "Identify Matter (Concept of Matter)", "code": "A.1", "sort_order": 0, "created_at": "2026-02-10 03:17:52.201569+00" },
    { "id": "6cc4c08e-9974-44bb-b5f6-40a41c2e2bdb", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Counting objects in a picture", "code": "PV.1", "sort_order": 1, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "f44495e2-08e8-4e27-a43b-0286613b0230", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Counting objects one-by-one", "code": "PV.2", "sort_order": 2, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "3c26506e-c15e-4268-8dc2-5bcd3013abf9", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Counting objects in groups", "code": "PV.3", "sort_order": 3, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "6d7492ae-d7fe-4cea-9fef-61686af57e0b", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Identifying groups and loose objects", "code": "PV.4", "sort_order": 4, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "069e44fb-8492-486a-8c47-803c9ff8248a", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Recognising objects packed in tens", "code": "PV.5", "sort_order": 5, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "c90e9f33-7e25-4f78-b197-71cb93576144", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Making groups of ten", "code": "PV.6", "sort_order": 6, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "ccc56cac-da31-4515-9b31-bc0bce78212b", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Representing numbers using tens and ones", "code": "PV.7", "sort_order": 7, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "4e7eead2-135f-4085-989a-b163cb8de369", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Understanding ten strips (1 ten = 10 units)", "code": "PV.8", "sort_order": 8, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "c8cf17d2-86c8-41a0-a9df-5262d0dd4b38", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Matching quantities using blocks and strips", "code": "PV.9", "sort_order": 9, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "77aea5dc-3d56-49a0-87e3-e4c687f165ab", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Completing place-value tables (tens & ones)", "code": "PV.10", "sort_order": 10, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "44d72391-bee2-41c7-a617-411933df6cab", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Making two-digit numbers using cards", "code": "PV.11", "sort_order": 11, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "2a6d4167-2c99-400b-89a8-a871d9f21eab", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Regrouping numbers into tens and ones", "code": "PV.12", "sort_order": 12, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "4cd27058-6270-4113-835c-f2e37024a2c5", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Comparing two-digit numbers using tens and ones", "code": "PV.13", "sort_order": 13, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "4a14b1b6-956e-483b-95f6-4f4a6990e2a2", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Using terms more than / less than", "code": "PV.14", "sort_order": 14, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "db1301cc-1e66-45da-b4fd-a360cd2afa4a", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Ordering numbers (ascending & descending)", "code": "PV.15", "sort_order": 15, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "d99f2a53-802e-4327-9049-d27907b1c197", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Identifying smallest and largest two-digit numbers", "code": "PV.16", "sort_order": 16, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "e83341bc-becf-42ff-b710-1a874acd1cd4", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Solving number riddles", "code": "PV.17", "sort_order": 17, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "2efc2c86-ba22-4435-9a3e-bab08b2ea562", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Logical path and sequence reasoning", "code": "PV.18", "sort_order": 18, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "8bc68c4f-5190-48fb-af0c-3eb79c81c683", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Understanding ordinal positions (1st, 2nd, 3rd…)", "code": "PV.19", "sort_order": 19, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "fbe329de-3fb5-4477-94a6-6ad3f4d17c23", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Reading and interpreting a calendar", "code": "PV.20", "sort_order": 20, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "adfe33e0-ce5e-41e4-8e39-cc60b2563cd8", "unit_id": "4d68c33a-f8c6-4511-848c-249f1726cc4f", "name": "Identifying numbers used in daily life", "code": "PV.21", "sort_order": 21, "created_at": "2026-02-09 03:19:16.20308+00" },
    { "id": "d1d51636-d3fb-42b8-966d-881900bfcc99", "unit_id": "d9f15752-22fa-4573-9eb8-8b5fba773682", "name": "Devision ", "code": "D.1", "sort_order": 1, "created_at": "2026-02-08 03:57:10.18734+00" },
    { "id": "f9f70952-9110-4f33-8e3b-0b1692529aa6", "unit_id": "41b4d133-93ea-474a-a6fe-745fd038c741", "name": "Long and short", "code": "L.1", "sort_order": 0, "created_at": "2026-02-07 14:33:37.662226+00" },
    { "id": "9dd1f822-11d3-4e59-a3ae-278d2c94d1e3", "unit_id": "bb517a42-3b66-4dc1-8aa4-88dd01a9d2d9", "name": " Relate time units", "code": "S.6", "sort_order": 6, "created_at": "2026-02-07 14:11:08.24965+00" },
    { "id": "3258a85f-26c5-4565-8e56-b612ec6656b6", "unit_id": "bb517a42-3b66-4dc1-8aa4-88dd01a9d2d9", "name": "Read a calendar", "code": "S.3", "sort_order": 3, "created_at": "2026-02-07 11:36:55.724306+00" },
    { "id": "8ede627c-ed91-4fe4-a185-80406ae8d2f6", "unit_id": "bb517a42-3b66-4dc1-8aa4-88dd01a9d2d9", "name": "Days of the week", "code": "S.1", "sort_order": 1, "created_at": "2026-02-07 07:52:47.298757+00" },
    { "id": "7940cb13-c0fa-44f3-bcbe-60f2c69e06fc", "unit_id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "name": "Identifying Indian Currency Notes & Coins", "code": "MON.1", "sort_order": 1, "created_at": "2026-02-03 11:30:12.016709+00" },
    { "id": "2b345b1b-5826-49aa-b330-baa375735aac", "unit_id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "name": "Recognizing Value of Each Coin & Note", "code": "MON.2", "sort_order": 2, "created_at": "2026-02-03 11:30:12.016709+00" },
    { "id": "7abd8f49-ae30-496a-a47e-ad7a64822325", "unit_id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "name": "Understanding 100 paise = 1 rupee", "code": "MON.3", "sort_order": 3, "created_at": "2026-02-03 11:30:12.016709+00" },
    { "id": "d1d52c0b-19a2-4146-88d3-4cf794667c29", "unit_id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "name": "Counting Simple Money Amounts from Pictures", "code": "MON.4", "sort_order": 4, "created_at": "2026-02-03 11:30:12.016709+00" },
    { "id": "c8834510-7aa3-45e1-8ab7-f993e32c3dcb", "unit_id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "name": "Matching Price with Correct Money", "code": "MON.5", "sort_order": 5, "created_at": "2026-02-03 11:30:12.016709+00" },
    { "id": "8fc8c717-1e3e-4943-bdf3-a105bc695b4b", "unit_id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "name": "Adding Money (notes + coins)", "code": "MON.6", "sort_order": 6, "created_at": "2026-02-03 11:30:12.016709+00" },
    { "id": "fdc28e46-4719-4e68-8bba-79323e842af6", "unit_id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "name": "Subtracting Money (spent & left)", "code": "MON.7", "sort_order": 7, "created_at": "2026-02-03 11:30:12.016709+00" },
    { "id": "0f669ba9-2ef0-4e6d-9cf4-5c4f56024321", "unit_id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "name": "Finding Total Cost of Multiple Items", "code": "MON.8", "sort_order": 8, "created_at": "2026-02-03 11:30:12.016709+00" },
    { "id": "4b424338-e257-4d3a-b06b-947b77bec138", "unit_id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "name": "Calculating Change", "code": "MON.9", "sort_order": 9, "created_at": "2026-02-03 11:30:12.016709+00" },
    { "id": "1c454c08-1796-4a3e-b30a-02120b593769", "unit_id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "name": "Repeated Addition with Money", "code": "MON.10", "sort_order": 10, "created_at": "2026-02-03 11:30:12.016709+00" },
    { "id": "cd9223de-e841-4cf9-a169-b02a2293abcd", "unit_id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "name": "Making ₹1 using different coins", "code": "MON.11", "sort_order": 11, "created_at": "2026-02-03 11:30:12.016709+00" },
    { "id": "7cfdc06a-9e85-45a4-9e98-48f68dd7060d", "unit_id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "name": "Making given amount using multiple combinations", "code": "MON.12", "sort_order": 12, "created_at": "2026-02-03 11:30:12.016709+00" },
    { "id": "06720519-ca11-4377-ad98-0dfd150e56f5", "unit_id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "name": "Comparing two money amounts", "code": "MON.13", "sort_order": 13, "created_at": "2026-02-03 11:30:12.016709+00" },
    { "id": "50e3e079-6967-4cb0-be3c-27a4c60345fa", "unit_id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "name": "Choosing best combination for maximum value", "code": "MON.14", "sort_order": 14, "created_at": "2026-02-03 11:30:12.016709+00" },
    { "id": "4ad7a84d-2222-48bb-87d0-872433fdf440", "unit_id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "name": "Word Problems on Money Addition", "code": "MON.15", "sort_order": 15, "created_at": "2026-02-03 11:30:12.016709+00" },
    { "id": "19a75e2c-c06e-4f9e-8254-856824969e46", "unit_id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "name": "Word Problems on Money Subtraction", "code": "MON.16", "sort_order": 16, "created_at": "2026-02-03 11:30:12.016709+00" },
    { "id": "ef28009c-f0fe-421a-bd70-61e75ea8f639", "unit_id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "name": "Multi-step money problems", "code": "MON.17", "sort_order": 17, "created_at": "2026-02-03 11:30:12.016709+00" },
    { "id": "c32c4fcf-7cc5-480d-aa07-88da76a2b7a9", "unit_id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "name": "Strategy based earning problems", "code": "MON.18", "sort_order": 18, "created_at": "2026-02-03 11:30:12.016709+00" },
    { "id": "1dab3e94-f868-4ddb-a48b-b4f7d13aa1d2", "unit_id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "name": "Real-life shopping calculations", "code": "MON.19", "sort_order": 19, "created_at": "2026-02-03 11:30:12.016709+00" },
    { "id": "8eac3560-6ae0-4f3d-a160-709a998a117f", "unit_id": "d6397e56-75fb-4b94-b2bd-3d6e78b053d5", "name": "Decision making: Enough money or not", "code": "MON.20", "sort_order": 20, "created_at": "2026-02-03 11:30:12.016709+00" },
    { "id": "7807b899-df98-41c3-8eb0-1165b52db286", "unit_id": "f7a09524-5133-4f83-9a4e-a52e6e636a56", "name": "Reading Picture Data – Favourite Colours", "code": "DH.1", "sort_order": 1, "created_at": "2026-01-31 13:27:45.098946+00" },
    { "id": "d939f2a2-4a80-4863-adca-e64790adb12b", "unit_id": "f7a09524-5133-4f83-9a4e-a52e6e636a56", "name": "Counting & Comparing Fruit Data", "code": "DH.2", "sort_order": 2, "created_at": "2026-01-31 13:27:45.098946+00" },
    { "id": "8b1a1ff6-b4f6-4e1f-8a13-157638ad45cd", "unit_id": "f7a09524-5133-4f83-9a4e-a52e6e636a56", "name": "Interpreting Transport Mode Table", "code": "DH.3", "sort_order": 3, "created_at": "2026-01-31 13:27:45.098946+00" },
    { "id": "838ab6a2-ab99-486a-bff1-97f157fccc80", "unit_id": "f7a09524-5133-4f83-9a4e-a52e6e636a56", "name": "Pictograph Representation & Reading", "code": "DH.4", "sort_order": 4, "created_at": "2026-01-31 13:27:45.098946+00" },
    { "id": "a15e8d17-7a6d-4d66-b2b0-fcce86bebb1c", "unit_id": "f7a09524-5133-4f83-9a4e-a52e6e636a56", "name": "Games Preference Data Analysis", "code": "DH.5", "sort_order": 5, "created_at": "2026-01-31 13:27:45.098946+00" },
    { "id": "da1c7798-ca07-4c4f-8c26-dc02f489fbdf", "unit_id": "f7a09524-5133-4f83-9a4e-a52e6e636a56", "name": "Real-life Survey Data Collection (Vegetables)", "code": "DH.6", "sort_order": 6, "created_at": "2026-01-31 13:27:45.098946+00" },
    { "id": "a4f53feb-2ab6-4b9a-9d21-93f480e9c190", "unit_id": "f7a09524-5133-4f83-9a4e-a52e6e636a56", "name": "Family Members Data Interpretation", "code": "DH.7", "sort_order": 7, "created_at": "2026-01-31 13:27:45.098946+00" },
    { "id": "776616d3-6bba-4ee4-a506-0035ecc15a1a", "unit_id": "f7a09524-5133-4f83-9a4e-a52e6e636a56", "name": "Number Pattern Recognition & Completion", "code": "LP.1", "sort_order": 8, "created_at": "2026-01-31 13:27:45.098946+00" },
    { "id": "10519630-2e7f-443b-a029-d175e2794a92", "unit_id": "f7a09524-5133-4f83-9a4e-a52e6e636a56", "name": "Logical Number Operation Puzzles", "code": "LP.2", "sort_order": 9, "created_at": "2026-01-31 13:27:45.098946+00" },
    { "id": "3bb1f4d4-320f-4587-8523-103c5a5b2067", "unit_id": "f7a09524-5133-4f83-9a4e-a52e6e636a56", "name": "Path Finding & Route Counting", "code": "LP.3", "sort_order": 10, "created_at": "2026-01-31 13:27:45.098946+00" },
    { "id": "7de17737-9b1c-4b65-896e-13812c101681", "unit_id": "f7a09524-5133-4f83-9a4e-a52e6e636a56", "name": "Number Names Identification (11–20)", "code": "NUM.1", "sort_order": 11, "created_at": "2026-01-31 13:27:45.098946+00" },
    { "id": "ec6f1505-fdbf-4f3b-9f04-eef53d7dce7e", "unit_id": "f7a09524-5133-4f83-9a4e-a52e6e636a56", "name": "Shape and Shadow Matching", "code": "GEO.1", "sort_order": 12, "created_at": "2026-01-31 13:27:45.098946+00" },
    { "id": "25cbf0a5-6875-47db-b114-74081dae616c", "unit_id": "f7a09524-5133-4f83-9a4e-a52e6e636a56", "name": "Counting Rectangles & Squares", "code": "GEO.2", "sort_order": 13, "created_at": "2026-01-31 13:27:45.098946+00" },
    { "id": "44346352-a085-4b50-b782-fdf0a1a03dee", "unit_id": "f7a09524-5133-4f83-9a4e-a52e6e636a56", "name": "Logical Number Arrangement (Equal Sums)", "code": "LP.4", "sort_order": 14, "created_at": "2026-01-31 13:27:45.098946+00" },
    { "id": "ffa9c955-b62a-4ad7-b88f-14189eb30170", "unit_id": "f7a09524-5133-4f83-9a4e-a52e6e636a56", "name": "Reverse Operations (Basic Algebra Thinking)", "code": "LP.5", "sort_order": 15, "created_at": "2026-01-31 13:27:45.098946+00" },
    { "id": "a392e3cc-14fb-4135-a8a2-f88218b819d9", "unit_id": "030424e3-3d8f-4239-96aa-85ed13ad519e", "name": "Testing", "code": "T.1", "sort_order": 3, "created_at": "2026-01-31 07:07:52.065525+00" },
    { "id": "1d6bac32-d3c4-4c85-9fa9-5361e0d444fd", "unit_id": "79406a3e-ac77-4a09-b005-df93d179d1dd", "name": "Identify multiple materials in objects", "code": "B.5", "sort_order": 5, "created_at": "2026-01-30 14:40:33.10606+00" },
    { "id": "1e45cb23-80f6-4620-b72b-848d4c61eea2", "unit_id": "79406a3e-ac77-4a09-b005-df93d179d1dd", "name": "Identify materials in objects", "code": "B.4", "sort_order": 4, "created_at": "2026-01-30 14:40:07.809182+00" },
    { "id": "1c7a1885-8be8-481b-9935-bbe29227cf6c", "unit_id": "79406a3e-ac77-4a09-b005-df93d179d1dd", "name": "Compare properties of materials", "code": "B.3", "sort_order": 3, "created_at": "2026-01-30 14:39:21.355966+00" },
    { "id": "b74172ec-421b-4901-b1a6-388d3db61f87", "unit_id": "79406a3e-ac77-4a09-b005-df93d179d1dd", "name": "Compare properties of objects", "code": "B.2", "sort_order": 2, "created_at": "2026-01-30 14:38:34.954016+00" },
    { "id": "2c063523-e8e6-4505-893d-75b5d65a05de", "unit_id": "79406a3e-ac77-4a09-b005-df93d179d1dd", "name": "Identify properties of an object", "code": "A.1", "sort_order": 1, "created_at": "2026-01-30 14:37:58.153642+00" },
    { "id": "e1b35205-854e-4701-9f7f-6c2814dbc8ab", "unit_id": "160c0a33-27ce-47da-b959-dc86b942d34f", "name": "Sort by the number of syllables", "code": "D.1", "sort_order": 1, "created_at": "2026-01-30 11:01:31.935687+00" },
    { "id": "c002326a-414c-4e8f-8379-1a97312d73ff", "unit_id": "f8958db8-5be6-4e1f-9d70-20ec4d681d19", "name": "Complete the word with the correct final consonant blend", "code": "C.2", "sort_order": 2, "created_at": "2026-01-30 10:05:25.247492+00" },
    { "id": "e57ee058-dfc0-44aa-b171-e38d9ecd9920", "unit_id": "f8958db8-5be6-4e1f-9d70-20ec4d681d19", "name": "Complete the word with the correct initial consonant blend", "code": "C.1", "sort_order": 1, "created_at": "2026-01-30 04:02:09.683439+00" },
    { "id": "72e66906-0e03-4667-aafc-00973b0ecf5c", "unit_id": "f40cff75-be07-4f5f-984b-3acf7b0404cd", "name": "Guess the Name", "code": "B.1", "sort_order": 1, "created_at": "2026-01-30 01:42:51.114769+00" },
    { "id": "331a02c8-66b6-4874-9f5d-0c3c0effa642", "unit_id": "1b6a3a12-2add-412b-b744-7ec3ca1188c4", "name": "Fun with friends", "code": "A.1", "sort_order": 1, "created_at": "2026-01-29 14:56:29.947279+00" },
    { "id": "55841244-74c1-438d-9df6-40fbf682d36c", "unit_id": "1ce97fc2-9483-43cd-9965-0756d8087342", "name": "Spell rhyming words to answer riddles", "code": "B.5", "sort_order": 5, "created_at": "2026-01-29 12:42:00.483302+00" },
    { "id": "b6b4d683-347b-4e9f-98ab-cb697e3b85f1", "unit_id": "1ce97fc2-9483-43cd-9965-0756d8087342", "name": "Complete the poem with a word that rhymes", "code": "B.4", "sort_order": 4, "created_at": "2026-01-29 12:41:15.700876+00" },
    { "id": "1de3cdce-e670-4afa-ac7d-97a6c604fe11", "unit_id": "1ce97fc2-9483-43cd-9965-0756d8087342", "name": "Complete the rhyme", "code": "B.3", "sort_order": 3, "created_at": "2026-01-29 12:32:31.9669+00" },
    { "id": "4864008d-0dec-4e08-bb2d-7f701275251e", "unit_id": "1ce97fc2-9483-43cd-9965-0756d8087342", "name": "Which word does not rhyme?", "code": "B.2", "sort_order": 2, "created_at": "2026-01-29 12:25:10.319578+00" },
    { "id": "e982adb6-851d-4498-9d3f-48a2f1e2abf2", "unit_id": "1ce97fc2-9483-43cd-9965-0756d8087342", "name": "Choose the picture that rhymes with the word", "code": "B.1", "sort_order": 1, "created_at": "2026-01-29 10:23:05.90477+00" },
    { "id": "6c3f3378-468f-41cc-a98f-c77540f61d9c", "unit_id": "dcccab58-cf92-41bc-bdc8-4f8591061adc", "name": "Which even or odd number comes before or after?", "code": "A.10", "sort_order": 10, "created_at": "2026-01-28 12:19:15.454664+00" },
    { "id": "e31acd74-5cb1-404e-a09f-e898c25134c7", "unit_id": "dcccab58-cf92-41bc-bdc8-4f8591061adc", "name": "Even or odd numbers on number lines", "code": "A.9", "sort_order": 9, "created_at": "2026-01-28 12:18:53.163898+00" },
    { "id": "67512f48-fb15-47c6-b82f-642569c37920", "unit_id": "dcccab58-cf92-41bc-bdc8-4f8591061adc", "name": "Select even or odd numbers", "code": "A.8", "sort_order": 8, "created_at": "2026-01-28 12:18:28.586648+00" },
    { "id": "f293384b-45a7-4bc3-83f5-e974e7e67811", "unit_id": "dcccab58-cf92-41bc-bdc8-4f8591061adc", "name": "Identify numbers as even or odd", "code": "A.7", "sort_order": 7, "created_at": "2026-01-28 12:18:05.890071+00" },
    { "id": "d7bcd2fd-cef2-43d7-8b34-f4c8859f86e1", "unit_id": "dcccab58-cf92-41bc-bdc8-4f8591061adc", "name": "Even or odd", "code": "A.6", "sort_order": 6, "created_at": "2026-01-28 12:17:01.322364+00" },
    { "id": "79c30c7d-6c3b-4268-ad63-ecb1e2de272a", "unit_id": "dcccab58-cf92-41bc-bdc8-4f8591061adc", "name": "Hundred chart", "code": "A.5", "sort_order": 5, "created_at": "2026-01-28 12:16:35.285276+00" },
    { "id": "8f94a289-466a-4ab5-ab05-0fb14dc59f7e", "unit_id": "dcccab58-cf92-41bc-bdc8-4f8591061adc", "name": "Number lines - up to 100", "code": "A.4", "sort_order": 4, "created_at": "2026-01-28 12:16:06.511153+00" },
    { "id": "d2085e36-b36e-4026-809e-ad58fa68c082", "unit_id": "dcccab58-cf92-41bc-bdc8-4f8591061adc", "name": "Counting patterns - up to 100", "code": "A.3", "sort_order": 3, "created_at": "2026-01-28 12:15:25.336974+00" },
    { "id": "d2c370a7-5b98-425d-b49d-04bb384da5c1", "unit_id": "dcccab58-cf92-41bc-bdc8-4f8591061adc", "name": "Skip-counting sequences", "code": "A.2", "sort_order": 2, "created_at": "2026-01-28 12:14:59.199926+00" },
    { "id": "a7ef60f0-07a7-4ff2-b5b1-176f6f5e6cf6", "unit_id": "dcccab58-cf92-41bc-bdc8-4f8591061adc", "name": "Skip-counting", "code": "A.1", "sort_order": 1, "created_at": "2026-01-28 12:14:13.878565+00" },
    { "id": "77777777-7777-7777-7777-777777777777", "unit_id": "39c2b14c-ba41-42b8-8fe1-376b8d52b001", "name": "Count forward and backward", "code": "A.1", "sort_order": 1, "created_at": "2026-01-27 18:13:20.771251+00" },
    { "id": "37ffed64-172a-4222-9e2f-59ef03b5d929", "unit_id": "030424e3-3d8f-4239-96aa-85ed13ad519e", "name": "Add one-digit numbers", "code": "B.1", "sort_order": 1, "created_at": "2026-01-27 18:13:20.771251+00" },
    { "id": "55555555-5555-5555-5555-555555555551", "unit_id": "030424e3-3d8f-4239-96aa-85ed13ad519e", "name": "Add doubles", "code": "B.2", "sort_order": 2, "created_at": "2026-01-27 18:13:20.771251+00" },
    { "id": "99999999-9999-9999-9999-999999999999", "unit_id": "39c2b14c-ba41-42b8-8fe1-376b8d52b001", "name": "Skip-counting by 2s", "code": "A.2", "sort_order": 2, "created_at": "2026-01-27 18:13:20.771251+00" }
];

// Helper functions to navigate the data hierarchy

export function getSubjectsByGradeId(gradeId) {
    return subjects.filter(s => s.grade_id === gradeId);
}

export function getUnitsBySubjectId(subjectId) {
    return units.filter(u => u.subject_id === subjectId).sort((a, b) => a.sort_order - b.sort_order);
}

export function getMicroskillsByUnitId(unitId) {
    return microskills.filter(m => m.unit_id === unitId).sort((a, b) => a.sort_order - b.sort_order);
}

export function getGradeById(gradeId) {
    return grades.find(g => g.id === gradeId);
}

export function getSubjectById(subjectId) {
    return subjects.find(s => s.id === subjectId);
}

export function getUnitById(unitId) {
    return units.find(u => u.id === unitId);
}

export function getMicroskillById(microskillId) {
    return microskills.find(m => m.id === microskillId);
}
