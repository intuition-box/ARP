# Notice — third-party data in `data/catalogue/`

## `oasf-1.1.0-skills.json` — Open Agentic Schema Framework (OASF)

- **Source:** https://github.com/agntcy/oasf, tag `v1.1.0`, commit `f510be0d4b5878ac8f86c64ffd6cd7132733c03e`, the files under `schema/skills/`.
- **Licence:** Apache License 2.0. A copy is `oasf-LICENSE.txt`, next to this file, taken verbatim from the repository's `LICENSE.md`.
- **What was changed:** the files were not copied as they are. `oasf-1.1.0-skills.json` is derived from them: for each skill it keeps `name`, `caption`, `description` and the parent (`extends`), and it adds an `id` computed as the parent's id × 100 + the skill's `uid`, which is how the OASF server prints it. `base_skill.json` is left out. Nothing else is altered.
- **The project's NOTICE** (`schema/NOTICE` in that repository), reproduced verbatim:

```
Open Agentic Schema Framework

Copyright © OCSF a Series of LF Projects, LLC
For web site terms of use, trademark policy and other project policies please see https://lfprojects.org.

This project includes the ICD Schema developed by Symantec, a division of Broadcom.

Licensed under the Apache 2 license.
Refer to the Apache 2 license in the file LICENSE.

Copyright (c) 2025 Cisco and/or its affiliates.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.# dir
```

No other file in `data/catalogue/` is known to be third-party material.
