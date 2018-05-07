import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
    name: 'minutesSeconds'
})
export class MinutesSecondsPipe implements PipeTransform {

    transform(value: number): string {
        if (value == undefined)
            return '';
        const minutes: number = Math.floor(value / 60);
        const hours: number = Math.floor(minutes / 60);
        if (hours == 0)
            return minutes.toString().padStart(2, '0') + ':' + (value - minutes * 60).toString().padStart(2, '0');
        else
            return hours.toString().padStart(2, '0') + ':' + (minutes - hours * 60).toString().padStart(2, '0') + ':' + (value - minutes * 60).toString().padStart(2, '0');
    }

}