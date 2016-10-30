/*
 Copyright (C) 2013-2015 by Justin DuJardin and Contributors

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
import {Component, Input} from '@angular/core';
import {Being} from '../../models/being';

@Component({
  selector: 'rpg-health-bar',
  styleUrls: ['./health-bar.component.scss'],
  template: `<md-progress-bar [ngClass]="getCSSClassMap()" [value]="getProgressBarWidth()"></md-progress-bar>`
})
export class RPGHealthBar {
  @Input()
  model: Being;

  getCSSClassMap(): {[className: string]: boolean} {
    if (!this.model) {
      return {};
    }
    var pct: number = Math.round(this.model.hp / this.model.maxhp * 100);
    return {
      dead: pct === 0,
      critical: pct < 33,
      hurt: pct < 66,
      fine: pct > 66
    };
  }

  getProgressBarWidth(): number {
    var width = 0;
    if (this.model && this.model) {
      width = Math.ceil(this.model.hp / this.model.maxhp * 100);
    }
    return width;
  }


}
