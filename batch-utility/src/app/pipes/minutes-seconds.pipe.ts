import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
    name: 'minutesSeconds'
})
export class MinutesSecondsPipe implements PipeTransform {

    transform(value: number): string {
        if (value == undefined)
            return '';
        const minutes: number = Math.floor(value / 60);
        return minutes.toString().padStart(2, '0') + ':' + (value - minutes * 60).toString().padStart(2, '0');
    }

}