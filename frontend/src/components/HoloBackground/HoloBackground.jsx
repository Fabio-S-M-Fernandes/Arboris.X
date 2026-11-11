import './HoloBackground.css';

const LEAF_VEIN = 'M24 60C24 43 23 26 24 5M24 42 13 29m11 5 11-13m-11 30L15 40m9 6 13-9';

export default function HoloBackground() {
  return (
    <div className="holo-background" aria-hidden="true">
      <div className="holo-layer holo-layer--far">
        <svg className="holo-forest" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMin slice" fill="none">
          <path className="holo-forest__distant" d="M0 164C29 144 47 140 64 151C75 116 99 104 122 131C137 93 165 82 190 117C211 70 244 68 267 111C289 83 317 91 335 128C359 96 389 91 411 127C433 77 465 66 492 108C515 80 546 86 564 124C591 88 621 88 641 128C667 75 701 73 725 117C750 82 778 82 800 123C828 91 858 91 879 131C903 74 938 67 961 111C988 76 1017 81 1038 122C1065 86 1095 89 1117 129C1142 77 1175 72 1199 116C1226 88 1256 92 1275 132C1300 97 1330 98 1350 139C1374 115 1404 124 1440 158V0H0Z" />
          <path className="holo-forest__crown" d="M0 104C58 72 88 95 132 45 172 13 209 54 234 38 272 5 317 45 350 59 387 15 432 30 465 66 500 18 544 28 580 58 616 20 663 40 698 79 739 34 778 47 814 75 850 28 898 34 932 63 972 18 1017 36 1054 70 1088 21 1134 42 1172 79 1213 35 1252 60 1286 85 1323 45 1373 70 1440 96V0H0Z" />
          <path className="holo-forest__trunk" d="M69 0C91 68 102 111 101 182M1348 0C1328 58 1315 104 1318 180M1388 0C1370 42 1363 78 1367 118" />
          <path className="holo-forest__branch" d="M101 67C72 40 47 29 18 24M102 95C130 65 153 48 183 40M1318 62C1287 37 1264 29 1235 27M1317 97C1342 72 1373 57 1408 52" />
        </svg>
      </div>

      <div className="holo-layer holo-layer--shafts">
        <div className="holo-light-shafts">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="holo-layer holo-layer--mid">
        <svg className="holo-mid-canopy" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMin slice" fill="none">
          <path d="M0 268C48 214 86 246 138 188C186 136 228 214 292 164C354 112 402 198 474 156C546 108 598 196 678 148C756 96 812 186 896 142C980 92 1038 178 1124 136C1196 98 1252 168 1324 128C1372 102 1412 146 1440 118V392C1384 348 1322 376 1254 332C1184 286 1126 356 1052 318C972 274 916 348 834 308C748 266 690 338 606 300C522 258 466 330 384 292C304 252 246 322 168 286C98 252 52 304 0 274Z" />
          <path d="M120 430C168 372 196 402 246 348C292 302 328 366 386 328C444 286 478 352 544 316C608 276 646 340 712 308C770 274 804 332 868 302C930 270 968 324 1034 296C1092 268 1130 318 1196 292C1254 268 1296 312 1356 288C1392 272 1420 298 1440 286V470C1388 446 1336 458 1276 436C1212 412 1168 448 1104 428C1036 406 992 442 924 422C852 400 808 436 736 416C664 394 620 430 548 410C476 388 432 424 360 404C292 384 248 416 180 400C140 388 92 412 48 402C28 396 8 408 0 416C18 452 62 468 120 430Z" />
        </svg>
      </div>

      <div className="holo-layer holo-layer--mist">
        <div className="holo-mist" />
      </div>

      <div className="holo-layer holo-layer--floor">
        <div className="holo-water">
          <span />
          <span />
          <span />
        </div>
        <svg className="holo-moss" viewBox="0 0 1440 240" preserveAspectRatio="none" fill="none">
          <path d="M18 168C46 142 62 118 96 124C124 92 168 98 198 132C228 108 272 116 296 148C274 176 228 188 184 196C132 206 74 198 36 178C22 170 12 176 18 168Z" />
          <path d="M48 198C78 176 104 164 142 172C176 150 214 156 246 182C220 202 176 210 136 208C96 206 64 206 48 198Z" />
          <path d="M508 186C548 158 598 150 652 168C702 142 756 154 804 188C760 210 692 216 628 212C568 208 522 204 508 186Z" />
          <path d="M1004 176C1048 146 1104 138 1168 158C1228 132 1288 144 1344 178C1304 206 1224 214 1148 208C1088 204 1032 198 1004 176Z" />
        </svg>
        <svg className="holo-roots" viewBox="0 0 1440 260" preserveAspectRatio="none" fill="none">
          <path d="M0 90C118 64 199 91 278 56 356 22 427 83 495 68 563 53 626 20 701 55 776 89 851 48 925 62 999 76 1073 34 1149 59 1224 85 1322 43 1440 70V260H0Z" />
          <path d="M65 70C91 118 82 173 116 240M144 70C130 117 161 173 157 239M1373 65C1345 117 1351 183 1312 248M1287 67C1303 123 1262 174 1266 237" />
        </svg>
      </div>

      <div className="holo-layer holo-layer--front">
        <svg className="holo-botanical holo-botanical--fern" viewBox="0 0 300 360" fill="none">
          <path className="holo-fern-stem" d="M20 356C73 282 112 195 142 30" />
          <path className="holo-fern-leaf" d="M79 278C38 276 15 252 8 219C42 220 70 237 88 263C54 242 39 218 40 190C74 205 94 231 97 257C76 221 74 190 90 164C117 193 126 226 112 251C104 211 115 178 140 151C157 189 154 223 132 247C132 205 151 175 182 155C191 194 180 227 151 247" />
          <path className="holo-fern-leaf" d="M52 318C25 303 13 280 15 254C42 265 59 284 66 306M95 250C65 231 54 206 60 179C87 196 103 220 105 243M121 190C97 165 93 138 105 113C127 137 136 163 131 185M135 124C122 97 127 72 146 48C163 75 166 100 153 122" />
        </svg>
        <svg className="holo-understory" viewBox="0 0 250 300" fill="none">
          <path className="holo-understory__stem" d="M8 298C59 228 91 151 122 18" />
          <path className="holo-understory__blade" d="M46 239C12 234 -5 212 1 181C29 188 49 207 57 230C34 210 27 190 34 168C58 181 72 201 68 223C71 194 86 173 112 158C119 189 110 214 85 233C100 208 125 194 152 198C145 226 125 245 95 250" />
          <path className="holo-understory__vein" d="M19 205C45 215 65 230 84 247M40 190 54 215m8-18 10 21m2-18-1 22m24-33-10 21m32-13-24 19" />
        </svg>
      </div>

      <div className="holo-layer holo-layer--air">
        <div className="holo-leaves">
          {Array.from({ length: 3 }, (_, index) => (
            <span key={index}>
              <svg viewBox="0 0 48 64" focusable="false">
                <path className="holo-leaf-blade" d="M24 2C10 10 3 23 5 37c2 13 12 22 19 25 7-3 17-12 19-25C45 23 38 10 24 2Z" />
                <path className="holo-leaf-vein" d={LEAF_VEIN} />
              </svg>
            </span>
          ))}
        </div>
        <div className="holo-pollen">
          {Array.from({ length: 6 }, (_, index) => <span key={index} />)}
        </div>
        <div className="holo-dew">
          {Array.from({ length: 3 }, (_, index) => <i key={index} />)}
        </div>
      </div>
    </div>
  );
}
